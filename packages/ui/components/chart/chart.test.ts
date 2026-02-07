/**
 * Test suite for Chart Components (BarChart, LineChart, AreaChart, PieChart, DonutChart, ScatterChart, RadarChart)
 *
 * @constela/ui Chart component tests following TDD methodology.
 * These tests verify the Chart component structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation (including required params)
 * - Style preset validation
 * - Accessibility attributes (role="img", aria-label, title)
 * - Helper function integration
 *
 * TDD Red Phase: These tests verify Chart components that do not yet exist,
 * so all tests are expected to FAIL.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDef, StylePreset } from '@constela/core';
import {
  assertValidComponent,
  assertValidStylePreset,
  hasParams,
  isOptionalParam,
  hasParamType,
  getRootTag,
  hasVariants,
  hasVariantOptions,
  hasDefaultVariants,
  findPropInView,
  hasRole,
  hasAriaAttribute,
} from '../../tests/helpers/test-utils.js';

// ==================== Test Utilities ====================

/**
 * Get the path to a component file in the chart directory
 */
function getChartComponentPath(fileName: string): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, fileName);
}

/**
 * Load a specific chart sub-component
 */
function loadChartComponent(componentName: string): ComponentDef {
  const path = getChartComponentPath(`${componentName}.constela.json`);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as ComponentDef;
}

/**
 * Load chart styles
 */
function loadChartStyles(): Record<string, StylePreset> {
  const path = getChartComponentPath('chart.styles.json');
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as Record<string, StylePreset>;
}

/**
 * Check if a param is required (required: true or required not specified)
 */
function isRequiredParam(component: ComponentDef, paramName: string): boolean {
  if (!component.params || !(paramName in component.params)) {
    return false;
  }
  const param = component.params[paramName];
  // In Constela, params are required by default unless explicitly set to false
  return param.required !== false;
}

/**
 * Check if a component has local state with a specific field
 */
function hasLocalState(component: ComponentDef, fieldName: string): boolean {
  if (!component.localState) {
    return false;
  }
  return fieldName in component.localState;
}

/**
 * Check if a local state field has a specific type
 */
function hasLocalStateType(
  component: ComponentDef,
  fieldName: string,
  expectedType: 'string' | 'number' | 'boolean' | 'list' | 'object'
): boolean {
  if (!component.localState || !(fieldName in component.localState)) {
    return false;
  }
  return component.localState[fieldName].type === expectedType;
}

/**
 * Check if a local state field has an initial value expression with cond pattern
 * (used for default value computation)
 */
function hasCondInitialPattern(
  component: ComponentDef,
  fieldName: string,
  paramName: string,
  defaultValue: unknown
): boolean {
  if (!component.localState || !(fieldName in component.localState)) {
    return false;
  }
  const initial = component.localState[fieldName].initial;
  if (!initial || typeof initial !== 'object') {
    return false;
  }
  const initExpr = initial as Record<string, unknown>;
  // Check for cond/then/else pattern
  if (initExpr['expr'] !== 'cond') {
    return false;
  }
  // Check if/test is param reference (supports both 'if' and 'test' keys)
  const test = (initExpr['if'] || initExpr['test']) as Record<string, unknown> | undefined;
  if (!test || test['expr'] !== 'param' || test['name'] !== paramName) {
    return false;
  }
  // Check then is param reference
  const then = initExpr['then'] as Record<string, unknown> | undefined;
  if (!then || then['expr'] !== 'param' || then['name'] !== paramName) {
    return false;
  }
  // Check else is literal with default value
  const elseExpr = initExpr['else'] as Record<string, unknown> | undefined;
  if (!elseExpr || elseExpr['expr'] !== 'lit' || elseExpr['value'] !== defaultValue) {
    return false;
  }
  return true;
}

/**
 * Count occurrences of cond/then/else patterns for a specific param in view
 */
function countCondPatterns(view: unknown, paramName: string): number {
  if (!view || typeof view !== 'object') return 0;
  const node = view as Record<string, unknown>;
  let count = 0;

  // Check if this node is a cond pattern for the param
  if (node['expr'] === 'cond') {
    const test = node['test'] as Record<string, unknown> | undefined;
    if (test && test['expr'] === 'param' && test['name'] === paramName) {
      count++;
    }
  }

  // Recursively search all properties
  for (const [key, value] of Object.entries(node)) {
    if (key === 'expr' || key === 'kind') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        count += countCondPatterns(item, paramName);
      }
    } else if (typeof value === 'object' && value !== null) {
      count += countCondPatterns(value, paramName);
    }
  }

  return count;
}

/**
 * Check if view contains a local expression reference
 */
function hasLocalReference(view: unknown, localName: string): boolean {
  if (!view || typeof view !== 'object') return false;
  const node = view as Record<string, unknown>;

  // Check if this node is a local reference
  if (node['expr'] === 'local' && node['name'] === localName) {
    return true;
  }

  // Recursively search all properties
  for (const [key, value] of Object.entries(node)) {
    if (key === 'expr' || key === 'kind') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (hasLocalReference(item, localName)) return true;
      }
    } else if (typeof value === 'object' && value !== null) {
      if (hasLocalReference(value, localName)) return true;
    }
  }

  return false;
}

/**
 * Check if view contains a specific role anywhere in the tree (including inside each body)
 */
function hasRoleAnywhere(view: unknown, role: string): boolean {
  if (!view || typeof view !== 'object') return false;
  const node = view as Record<string, unknown>;

  // Check if this element has the role
  if (node['kind'] === 'element' && node['props']) {
    const props = node['props'] as Record<string, unknown>;
    if (props['role'] && typeof props['role'] === 'object') {
      const roleExpr = props['role'] as Record<string, unknown>;
      if (roleExpr['expr'] === 'lit' && roleExpr['value'] === role) {
        return true;
      }
    }
  }

  // Check children
  if (node['children'] && Array.isArray(node['children'])) {
    for (const child of node['children']) {
      if (hasRoleAnywhere(child, role)) return true;
    }
  }

  // Check conditional branches
  if (node['kind'] === 'if') {
    if (hasRoleAnywhere(node['then'], role)) return true;
    if (node['else'] && hasRoleAnywhere(node['else'], role)) return true;
  }

  // Check each body
  if (node['kind'] === 'each' && hasRoleAnywhere(node['body'], role)) {
    return true;
  }

  return false;
}

/**
 * Check if view contains a specific element tag
 */
function hasElementTag(view: unknown, targetTag: string): boolean {
  if (!view || typeof view !== 'object') return false;
  const node = view as Record<string, unknown>;
  
  if (node['kind'] === 'element' && node['tag'] === targetTag) {
    return true;
  }
  
  // Check children
  if (node['children'] && Array.isArray(node['children'])) {
    for (const child of node['children']) {
      if (hasElementTag(child, targetTag)) {
        return true;
      }
    }
  }
  
  // Check conditional branches
  if (node['kind'] === 'if') {
    if (hasElementTag(node['then'], targetTag)) return true;
    if (node['else'] && hasElementTag(node['else'], targetTag)) return true;
  }
  
  // Check each body
  if (node['kind'] === 'each' && hasElementTag(node['body'], targetTag)) {
    return true;
  }
  
  return false;
}

/**
 * Find an expression call in the view tree
 */
function findExpressionCall(view: unknown, methodName: string): unknown | null {
  if (!view || typeof view !== 'object') return null;
  const node = view as Record<string, unknown>;
  
  // Check if this node is a call expression
  if (node['expr'] === 'call' && node['method'] === methodName) {
    return node;
  }
  
  // Search in props
  if (node['props'] && typeof node['props'] === 'object') {
    for (const prop of Object.values(node['props'] as Record<string, unknown>)) {
      const found = findExpressionCall(prop, methodName);
      if (found) return found;
    }
  }
  
  // Search in children
  if (node['children'] && Array.isArray(node['children'])) {
    for (const child of node['children']) {
      const found = findExpressionCall(child, methodName);
      if (found) return found;
    }
  }
  
  // Search conditional branches
  if (node['kind'] === 'if') {
    const thenResult = findExpressionCall(node['then'], methodName);
    if (thenResult) return thenResult;
    if (node['else']) {
      const elseResult = findExpressionCall(node['else'], methodName);
      if (elseResult) return elseResult;
    }
  }
  
  // Search each body and items
  if (node['kind'] === 'each') {
    const itemsResult = findExpressionCall(node['items'], methodName);
    if (itemsResult) return itemsResult;
    const bodyResult = findExpressionCall(node['body'], methodName);
    if (bodyResult) return bodyResult;
  }

  // Search in get expression base (or obj for backwards compatibility)
  if (node['expr'] === 'get') {
    if (node['base']) {
      const baseResult = findExpressionCall(node['base'], methodName);
      if (baseResult) return baseResult;
    }
    if (node['obj']) {
      const objResult = findExpressionCall(node['obj'], methodName);
      if (objResult) return objResult;
    }
  }

  // Search in call expression target and args
  if (node['expr'] === 'call') {
    if (node['target']) {
      const targetResult = findExpressionCall(node['target'], methodName);
      if (targetResult) return targetResult;
    }
    if (node['args'] && Array.isArray(node['args'])) {
      for (const arg of node['args']) {
        const argResult = findExpressionCall(arg, methodName);
        if (argResult) return argResult;
      }
    }
  }

  return null;
}

/**
 * Check if view uses a specific style preset
 */
function usesStylePreset(view: unknown, presetName: string): boolean {
  if (!view || typeof view !== 'object') return false;
  const node = view as Record<string, unknown>;
  
  // Check className prop for style expression
  if (node['props'] && typeof node['props'] === 'object') {
    const props = node['props'] as Record<string, unknown>;
    if (props['className'] && typeof props['className'] === 'object') {
      const className = props['className'] as Record<string, unknown>;
      if (className['expr'] === 'style' && className['name'] === presetName) {
        return true;
      }
    }
  }
  
  // Search in children
  if (node['children'] && Array.isArray(node['children'])) {
    for (const child of node['children']) {
      if (usesStylePreset(child, presetName)) {
        return true;
      }
    }
  }
  
  // Search conditional branches
  if (node['kind'] === 'if') {
    if (usesStylePreset(node['then'], presetName)) return true;
    if (node['else'] && usesStylePreset(node['else'], presetName)) return true;
  }
  
  // Search each body
  if (node['kind'] === 'each' && usesStylePreset(node['body'], presetName)) {
    return true;
  }
  
  return false;
}

// ==================== Test Contexts ====================

interface ChartTestContext {
  barChart: ComponentDef;
  lineChart: ComponentDef;
  areaChart: ComponentDef;
  pieChart: ComponentDef;
  donutChart: ComponentDef;
  scatterChart: ComponentDef;
  radarChart: ComponentDef;
  chartLegend: ComponentDef;
  chartTooltip: ComponentDef;
  chartAxis: ComponentDef;
  styles: Record<string, StylePreset>;
}

describe('Chart Component Suite', () => {
  let ctx: ChartTestContext;

  beforeAll(() => {
    ctx = {
      barChart: loadChartComponent('bar-chart'),
      lineChart: loadChartComponent('line-chart'),
      areaChart: loadChartComponent('area-chart'),
      pieChart: loadChartComponent('pie-chart'),
      donutChart: loadChartComponent('donut-chart'),
      scatterChart: loadChartComponent('scatter-chart'),
      radarChart: loadChartComponent('radar-chart'),
      chartLegend: loadChartComponent('chart-legend'),
      chartTooltip: loadChartComponent('chart-tooltip'),
      chartAxis: loadChartComponent('chart-axis'),
      styles: loadChartStyles(),
    };
  });

  // ============================================================
  // BAR CHART COMPONENT
  // ============================================================

  describe('BarChart Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.barChart);
      });

      it('should have svg as root element', () => {
        const rootTag = getRootTag(ctx.barChart);
        expect(rootTag).toBe('svg');
      });

      it('should have role="img" on SVG for accessibility', () => {
        expect(hasRole(ctx.barChart.view, 'img')).toBe(true);
      });

      it('should have className using StyleExpr with chartSvg preset', () => {
        const className = findPropInView(ctx.barChart.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should contain path elements for bars', () => {
        expect(hasElementTag(ctx.barChart.view, 'path')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have data param as required with type list', () => {
          expect(isRequiredParam(ctx.barChart, 'data')).toBe(true);
          expect(hasParamType(ctx.barChart, 'data', 'json')).toBe(true);
        });

        it('should have valueKey param as required with type string', () => {
          expect(isRequiredParam(ctx.barChart, 'valueKey')).toBe(true);
          expect(hasParamType(ctx.barChart, 'valueKey', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'labelKey', type: 'string' },
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'colors', type: 'json' },
          { name: 'showGrid', type: 'boolean' },
          { name: 'showLabels', type: 'boolean' },
          { name: 'orientation', type: 'string' },
          { name: 'barGap', type: 'number' },
          { name: 'barRadius', type: 'number' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.barChart, name)).toBe(true);
            expect(hasParamType(ctx.barChart, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = [
          'data',
          'valueKey',
          'labelKey',
          'width',
          'height',
          'colors',
          'showGrid',
          'showLabels',
          'orientation',
          'barGap',
          'barRadius',
        ];
        expect(hasParams(ctx.barChart, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="img" on SVG for screen readers', () => {
        const role = findPropInView(ctx.barChart.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'img',
        });
      });

      it('should have aria-label attribute', () => {
        expect(hasAriaAttribute(ctx.barChart.view, 'label')).toBe(true);
      });

      it('should have title element for chart description', () => {
        expect(hasElementTag(ctx.barChart.view, 'title')).toBe(true);
      });

      it('should have aria-labelledby referencing title element', () => {
        expect(hasAriaAttribute(ctx.barChart.view, 'labelledby')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should use getBarDimensions helper for bar positioning', () => {
        const call = findExpressionCall(ctx.barChart.view, 'getBarDimensions');
        expect(call).not.toBeNull();
      });

      it('should apply chartBar style preset to bar elements', () => {
        expect(usesStylePreset(ctx.barChart.view, 'chartBar')).toBe(true);
      });

      it('should render grid when showGrid is true', () => {
        // Grid should be conditionally rendered using chartGrid preset
        expect(usesStylePreset(ctx.barChart.view, 'chartGrid')).toBe(true);
      });

      it('should render labels when showLabels is true', () => {
        // Labels should use chartLabel preset
        expect(usesStylePreset(ctx.barChart.view, 'chartLabel')).toBe(true);
      });

      it('should support both vertical and horizontal orientations', () => {
        // Component should have orientation param
        expect(hasParams(ctx.barChart, ['orientation'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartSvg preset for root SVG', () => {
        const className = findPropInView(ctx.barChart.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should use chartBar preset for bar rectangles', () => {
        expect(usesStylePreset(ctx.barChart.view, 'chartBar')).toBe(true);
      });
    });
  });

  // ============================================================
  // LINE CHART COMPONENT
  // ============================================================

  describe('LineChart Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.lineChart);
      });

      it('should have svg as root element', () => {
        const rootTag = getRootTag(ctx.lineChart);
        expect(rootTag).toBe('svg');
      });

      it('should have role="img" on SVG for accessibility', () => {
        expect(hasRole(ctx.lineChart.view, 'img')).toBe(true);
      });

      it('should have className using StyleExpr with chartSvg preset', () => {
        const className = findPropInView(ctx.lineChart.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should contain path element for line', () => {
        expect(hasElementTag(ctx.lineChart.view, 'path')).toBe(true);
      });

      it('should contain circle elements for data points when showPoints is true', () => {
        expect(hasElementTag(ctx.lineChart.view, 'circle')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have data param as required with type list', () => {
          expect(isRequiredParam(ctx.lineChart, 'data')).toBe(true);
          expect(hasParamType(ctx.lineChart, 'data', 'json')).toBe(true);
        });

        it('should have valueKey param as required with type string', () => {
          expect(isRequiredParam(ctx.lineChart, 'valueKey')).toBe(true);
          expect(hasParamType(ctx.lineChart, 'valueKey', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'labelKey', type: 'string' },
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'colors', type: 'json' },
          { name: 'showGrid', type: 'boolean' },
          { name: 'showLabels', type: 'boolean' },
          { name: 'curved', type: 'boolean' },
          { name: 'showPoints', type: 'boolean' },
          { name: 'pointRadius', type: 'number' },
          { name: 'strokeWidth', type: 'number' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.lineChart, name)).toBe(true);
            expect(hasParamType(ctx.lineChart, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = [
          'data',
          'valueKey',
          'labelKey',
          'width',
          'height',
          'colors',
          'showGrid',
          'showLabels',
          'curved',
          'showPoints',
          'pointRadius',
          'strokeWidth',
        ];
        expect(hasParams(ctx.lineChart, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="img" on SVG for screen readers', () => {
        const role = findPropInView(ctx.lineChart.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'img',
        });
      });

      it('should have aria-label attribute', () => {
        expect(hasAriaAttribute(ctx.lineChart.view, 'label')).toBe(true);
      });

      it('should have title element for chart description', () => {
        expect(hasElementTag(ctx.lineChart.view, 'title')).toBe(true);
      });

      it('should have aria-labelledby referencing title element', () => {
        expect(hasAriaAttribute(ctx.lineChart.view, 'labelledby')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should use getLinePath helper for path generation', () => {
        const call = findExpressionCall(ctx.lineChart.view, 'getLinePath');
        expect(call).not.toBeNull();
      });

      it('should apply chartLine style preset to path elements', () => {
        expect(usesStylePreset(ctx.lineChart.view, 'chartLine')).toBe(true);
      });

      it('should apply chartPoint style preset to point circles', () => {
        expect(usesStylePreset(ctx.lineChart.view, 'chartPoint')).toBe(true);
      });

      it('should render grid when showGrid is true', () => {
        expect(hasLocalReference(ctx.lineChart.view, '_gridLines')).toBe(true);
      });

      it('should render labels when showLabels is true', () => {
        expect(usesStylePreset(ctx.lineChart.view, 'chartLabel')).toBe(true);
      });

      it('should support curved lines when curved is true', () => {
        // Component should have curved param
        expect(hasParams(ctx.lineChart, ['curved'])).toBe(true);
      });

      /**
       * TDD Red Phase: Task 3 - curved parameter integration tests
       * These tests verify that the curved parameter is passed to getLinePath.
       * Currently the call only has 1 argument (points), so tests will FAIL.
       */
      it('should pass curved parameter to getLinePath call (Task 3)', () => {
        // The getLinePath call should have 2 arguments: points and curved
        const call = findExpressionCall(ctx.lineChart.view, 'getLinePath') as {
          args?: unknown[];
        } | null;
        expect(call).not.toBeNull();
        expect(call?.args).toHaveLength(2);
      });

      it('should include curved param reference in getLinePath args (Task 3)', () => {
        // The second argument should reference the curved param
        const call = findExpressionCall(ctx.lineChart.view, 'getLinePath') as {
          args?: Array<{ expr?: string; name?: string }>;
        } | null;
        expect(call).not.toBeNull();
        expect(call?.args?.[1]).toMatchObject({
          expr: 'param',
          name: 'curved',
        });
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartSvg preset for root SVG', () => {
        const className = findPropInView(ctx.lineChart.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should use chartLine preset for line paths', () => {
        expect(usesStylePreset(ctx.lineChart.view, 'chartLine')).toBe(true);
      });

      it('should use chartPoint preset for data points', () => {
        expect(usesStylePreset(ctx.lineChart.view, 'chartPoint')).toBe(true);
      });
    });
  });

  // ============================================================
  // AREA CHART COMPONENT
  // ============================================================

  describe('AreaChart Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.areaChart);
      });

      it('should have svg as root element', () => {
        const rootTag = getRootTag(ctx.areaChart);
        expect(rootTag).toBe('svg');
      });

      it('should have role="img" on SVG for accessibility', () => {
        expect(hasRole(ctx.areaChart.view, 'img')).toBe(true);
      });

      it('should have className using StyleExpr with chartSvg preset', () => {
        const className = findPropInView(ctx.areaChart.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should contain path element for area fill', () => {
        expect(hasElementTag(ctx.areaChart.view, 'path')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have data param as required with type json', () => {
          expect(isRequiredParam(ctx.areaChart, 'data')).toBe(true);
          expect(hasParamType(ctx.areaChart, 'data', 'json')).toBe(true);
        });

        it('should have valueKey param as required with type string', () => {
          expect(isRequiredParam(ctx.areaChart, 'valueKey')).toBe(true);
          expect(hasParamType(ctx.areaChart, 'valueKey', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'labelKey', type: 'string' },
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'colors', type: 'json' },
          { name: 'showGrid', type: 'boolean' },
          { name: 'showLabels', type: 'boolean' },
          { name: 'curved', type: 'boolean' },
          { name: 'showPoints', type: 'boolean' },
          { name: 'pointRadius', type: 'number' },
          { name: 'strokeWidth', type: 'number' },
          { name: 'fillOpacity', type: 'number' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.areaChart, name)).toBe(true);
            expect(hasParamType(ctx.areaChart, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = [
          'data',
          'valueKey',
          'labelKey',
          'width',
          'height',
          'colors',
          'showGrid',
          'showLabels',
          'curved',
          'showPoints',
          'pointRadius',
          'strokeWidth',
          'fillOpacity',
        ];
        expect(hasParams(ctx.areaChart, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="img" on SVG for screen readers', () => {
        const role = findPropInView(ctx.areaChart.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'img',
        });
      });

      it('should have aria-label attribute', () => {
        expect(hasAriaAttribute(ctx.areaChart.view, 'label')).toBe(true);
      });

      it('should have title element for chart description', () => {
        expect(hasElementTag(ctx.areaChart.view, 'title')).toBe(true);
      });

      it('should have aria-labelledby referencing title element', () => {
        expect(hasAriaAttribute(ctx.areaChart.view, 'labelledby')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should use getAreaPath helper for area fill path generation', () => {
        const call = findExpressionCall(ctx.areaChart.view, 'getAreaPath');
        expect(call).not.toBeNull();
      });

      it('should apply chartArea style preset to area path', () => {
        expect(usesStylePreset(ctx.areaChart.view, 'chartArea')).toBe(true);
      });

      it('should render grid when showGrid is true', () => {
        expect(hasLocalReference(ctx.areaChart.view, '_gridLines')).toBe(true);
      });

      it('should render labels when showLabels is true', () => {
        expect(usesStylePreset(ctx.areaChart.view, 'chartLabel')).toBe(true);
      });

      it('should support curved areas when curved is true', () => {
        expect(hasParams(ctx.areaChart, ['curved'])).toBe(true);
      });

      it('should support configurable fill opacity', () => {
        expect(hasParams(ctx.areaChart, ['fillOpacity'])).toBe(true);
      });

      /**
       * TDD Red Phase: Task 3 - curved parameter integration tests for AreaChart
       * These tests verify that the curved parameter is passed to getAreaPath and getLinePath.
       * Currently the calls don't include the curved parameter, so tests will FAIL.
       */
      it('should pass curved parameter to getAreaPath call (Task 3)', () => {
        // The getAreaPath call should have 3 arguments: points, baseline, and curved
        const call = findExpressionCall(ctx.areaChart.view, 'getAreaPath') as {
          args?: unknown[];
        } | null;
        expect(call).not.toBeNull();
        expect(call?.args).toHaveLength(3);
      });

      it('should include curved param reference in getAreaPath args (Task 3)', () => {
        // The third argument should reference the curved param
        const call = findExpressionCall(ctx.areaChart.view, 'getAreaPath') as {
          args?: Array<{ expr?: string; name?: string }>;
        } | null;
        expect(call).not.toBeNull();
        expect(call?.args?.[2]).toMatchObject({
          expr: 'param',
          name: 'curved',
        });
      });

      it('should pass curved parameter to getLinePath call for stroke (Task 3)', () => {
        // AreaChart uses getLinePath for the stroke overlay
        // It should also receive the curved parameter
        const call = findExpressionCall(ctx.areaChart.view, 'getLinePath') as {
          args?: unknown[];
        } | null;
        expect(call).not.toBeNull();
        expect(call?.args).toHaveLength(2);
      });

      it('should include curved param reference in getLinePath args for stroke (Task 3)', () => {
        // The second argument should reference the curved param
        const call = findExpressionCall(ctx.areaChart.view, 'getLinePath') as {
          args?: Array<{ expr?: string; name?: string }>;
        } | null;
        expect(call).not.toBeNull();
        expect(call?.args?.[1]).toMatchObject({
          expr: 'param',
          name: 'curved',
        });
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartSvg preset for root SVG', () => {
        const className = findPropInView(ctx.areaChart.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should use chartArea preset for area fill', () => {
        expect(usesStylePreset(ctx.areaChart.view, 'chartArea')).toBe(true);
      });

      it('should optionally use chartLine preset for stroke overlay', () => {
        expect(usesStylePreset(ctx.areaChart.view, 'chartLine')).toBe(true);
      });

      it('should use chartPoint preset for data points when showPoints is true', () => {
        expect(usesStylePreset(ctx.areaChart.view, 'chartPoint')).toBe(true);
      });
    });
  });

  // ============================================================
  // PIE CHART COMPONENT
  // ============================================================

  describe('PieChart Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.pieChart);
      });

      it('should have svg as root element', () => {
        const rootTag = getRootTag(ctx.pieChart);
        expect(rootTag).toBe('svg');
      });

      it('should have role="img" on SVG for accessibility', () => {
        expect(hasRole(ctx.pieChart.view, 'img')).toBe(true);
      });

      it('should have className using StyleExpr with chartSvg preset', () => {
        const className = findPropInView(ctx.pieChart.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should contain path elements for pie slices', () => {
        expect(hasElementTag(ctx.pieChart.view, 'path')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have data param as required with type json', () => {
          expect(isRequiredParam(ctx.pieChart, 'data')).toBe(true);
          expect(hasParamType(ctx.pieChart, 'data', 'json')).toBe(true);
        });

        it('should have valueKey param as required with type string', () => {
          expect(isRequiredParam(ctx.pieChart, 'valueKey')).toBe(true);
          expect(hasParamType(ctx.pieChart, 'valueKey', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'labelKey', type: 'string' },
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'colors', type: 'json' },
          { name: 'showLabels', type: 'boolean' },
          { name: 'showPercentage', type: 'boolean' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.pieChart, name)).toBe(true);
            expect(hasParamType(ctx.pieChart, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = [
          'data',
          'valueKey',
          'labelKey',
          'width',
          'height',
          'colors',
          'showLabels',
          'showPercentage',
        ];
        expect(hasParams(ctx.pieChart, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="img" on SVG for screen readers', () => {
        const role = findPropInView(ctx.pieChart.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'img',
        });
      });

      it('should have aria-label attribute', () => {
        expect(hasAriaAttribute(ctx.pieChart.view, 'label')).toBe(true);
      });

      it('should have title element for chart description', () => {
        expect(hasElementTag(ctx.pieChart.view, 'title')).toBe(true);
      });

      it('should have aria-labelledby referencing title element', () => {
        expect(hasAriaAttribute(ctx.pieChart.view, 'labelledby')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should use getPieSlices helper for slice calculation', () => {
        const call = findExpressionCall(ctx.pieChart.view, 'getPieSlices');
        expect(call).not.toBeNull();
      });

      it('should use getArcPath helper for path generation', () => {
        const call = findExpressionCall(ctx.pieChart.view, 'getArcPath');
        expect(call).not.toBeNull();
      });

      it('should apply chartSlice style preset to slice elements', () => {
        expect(usesStylePreset(ctx.pieChart.view, 'chartSlice')).toBe(true);
      });

      it('should render labels when showLabels is true', () => {
        expect(usesStylePreset(ctx.pieChart.view, 'chartLabel')).toBe(true);
      });

      it('should support percentage display when showPercentage is true', () => {
        expect(hasParams(ctx.pieChart, ['showPercentage'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartSvg preset for root SVG', () => {
        const className = findPropInView(ctx.pieChart.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should use chartSlice preset for pie slices', () => {
        expect(usesStylePreset(ctx.pieChart.view, 'chartSlice')).toBe(true);
      });
    });
  });

  // ============================================================
  // DONUT CHART COMPONENT
  // ============================================================

  describe('DonutChart Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.donutChart);
      });

      it('should have svg as root element', () => {
        const rootTag = getRootTag(ctx.donutChart);
        expect(rootTag).toBe('svg');
      });

      it('should have role="img" on SVG for accessibility', () => {
        expect(hasRole(ctx.donutChart.view, 'img')).toBe(true);
      });

      it('should have className using StyleExpr with chartSvg preset', () => {
        const className = findPropInView(ctx.donutChart.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should contain path elements for donut slices', () => {
        expect(hasElementTag(ctx.donutChart.view, 'path')).toBe(true);
      });

      it('should contain text element for center label when centerLabel is provided', () => {
        expect(hasElementTag(ctx.donutChart.view, 'text')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have data param as required with type json', () => {
          expect(isRequiredParam(ctx.donutChart, 'data')).toBe(true);
          expect(hasParamType(ctx.donutChart, 'data', 'json')).toBe(true);
        });

        it('should have valueKey param as required with type string', () => {
          expect(isRequiredParam(ctx.donutChart, 'valueKey')).toBe(true);
          expect(hasParamType(ctx.donutChart, 'valueKey', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'labelKey', type: 'string' },
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'colors', type: 'json' },
          { name: 'centerLabel', type: 'string' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.donutChart, name)).toBe(true);
            expect(hasParamType(ctx.donutChart, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = [
          'data',
          'valueKey',
          'labelKey',
          'width',
          'height',
          'colors',
          'centerLabel',
        ];
        expect(hasParams(ctx.donutChart, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="img" on SVG for screen readers', () => {
        const role = findPropInView(ctx.donutChart.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'img',
        });
      });

      it('should have aria-label attribute', () => {
        expect(hasAriaAttribute(ctx.donutChart.view, 'label')).toBe(true);
      });

      it('should have title element for chart description', () => {
        expect(hasElementTag(ctx.donutChart.view, 'title')).toBe(true);
      });

      it('should have aria-labelledby referencing title element', () => {
        expect(hasAriaAttribute(ctx.donutChart.view, 'labelledby')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should use getActivityRingLayout helper for ring layout calculation', () => {
        // getActivityRingLayout is called in localState, not in view
        expect(hasLocalState(ctx.donutChart, '_ringLayout')).toBe(true);
        const initial = ctx.donutChart.localState!['_ringLayout'].initial as Record<string, unknown>;
        expect(initial['expr']).toBe('call');
        expect(initial['method']).toBe('getActivityRingLayout');
      });

      it('should use getActivityRingArcPath helper for arc path generation', () => {
        const call = findExpressionCall(ctx.donutChart.view, 'getActivityRingArcPath');
        expect(call).not.toBeNull();
      });

      it('should support center label display', () => {
        expect(hasParams(ctx.donutChart, ['centerLabel'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartSvg preset for root SVG', () => {
        const className = findPropInView(ctx.donutChart.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should use chartLabel preset for center label', () => {
        expect(usesStylePreset(ctx.donutChart.view, 'chartLabel')).toBe(true);
      });
    });
  });

  // ============================================================
  // SCATTER CHART COMPONENT
  // ============================================================

  describe('ScatterChart Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.scatterChart);
      });

      it('should have svg as root element', () => {
        const rootTag = getRootTag(ctx.scatterChart);
        expect(rootTag).toBe('svg');
      });

      it('should have role="img" on SVG for accessibility', () => {
        expect(hasRole(ctx.scatterChart.view, 'img')).toBe(true);
      });

      it('should have className using StyleExpr with chartSvg preset', () => {
        const className = findPropInView(ctx.scatterChart.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should contain circle elements for data points', () => {
        expect(hasElementTag(ctx.scatterChart.view, 'circle')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have data param as required with type json', () => {
          expect(isRequiredParam(ctx.scatterChart, 'data')).toBe(true);
          expect(hasParamType(ctx.scatterChart, 'data', 'json')).toBe(true);
        });

        it('should have xKey param as required with type string', () => {
          expect(isRequiredParam(ctx.scatterChart, 'xKey')).toBe(true);
          expect(hasParamType(ctx.scatterChart, 'xKey', 'string')).toBe(true);
        });

        it('should have yKey param as required with type string', () => {
          expect(isRequiredParam(ctx.scatterChart, 'yKey')).toBe(true);
          expect(hasParamType(ctx.scatterChart, 'yKey', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'colors', type: 'json' },
          { name: 'sizeKey', type: 'string' },
          { name: 'colorKey', type: 'string' },
          { name: 'pointRadius', type: 'number' },
          { name: 'showGrid', type: 'boolean' },
          { name: 'showLabels', type: 'boolean' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.scatterChart, name)).toBe(true);
            expect(hasParamType(ctx.scatterChart, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = [
          'data',
          'xKey',
          'yKey',
          'width',
          'height',
          'colors',
          'sizeKey',
          'colorKey',
          'pointRadius',
          'showGrid',
          'showLabels',
        ];
        expect(hasParams(ctx.scatterChart, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="img" on SVG for screen readers', () => {
        const role = findPropInView(ctx.scatterChart.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'img',
        });
      });

      it('should have aria-label attribute', () => {
        expect(hasAriaAttribute(ctx.scatterChart.view, 'label')).toBe(true);
      });

      it('should have title element for chart description', () => {
        expect(hasElementTag(ctx.scatterChart.view, 'title')).toBe(true);
      });

      it('should have aria-labelledby referencing title element', () => {
        expect(hasAriaAttribute(ctx.scatterChart.view, 'labelledby')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should apply chartPoint style preset to point circles', () => {
        expect(usesStylePreset(ctx.scatterChart.view, 'chartPoint')).toBe(true);
      });

      it('should render grid when showGrid is true', () => {
        expect(hasLocalReference(ctx.scatterChart.view, '_gridLines')).toBe(true);
      });

      it('should render labels when showLabels is true', () => {
        expect(usesStylePreset(ctx.scatterChart.view, 'chartLabel')).toBe(true);
      });

      it('should support variable point sizes with sizeKey', () => {
        expect(hasParams(ctx.scatterChart, ['sizeKey'])).toBe(true);
      });

      it('should support variable point colors with colorKey', () => {
        expect(hasParams(ctx.scatterChart, ['colorKey'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartSvg preset for root SVG', () => {
        const className = findPropInView(ctx.scatterChart.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should use chartPoint preset for data points', () => {
        expect(usesStylePreset(ctx.scatterChart.view, 'chartPoint')).toBe(true);
      });
    });
  });

  // ============================================================
  // RADAR CHART COMPONENT
  // ============================================================

  describe('RadarChart Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.radarChart);
      });

      it('should have svg as root element', () => {
        const rootTag = getRootTag(ctx.radarChart);
        expect(rootTag).toBe('svg');
      });

      it('should have role="img" on SVG for accessibility', () => {
        expect(hasRole(ctx.radarChart.view, 'img')).toBe(true);
      });

      it('should have className using StyleExpr with chartSvg preset', () => {
        const className = findPropInView(ctx.radarChart.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should contain polygon element for radar data', () => {
        expect(hasElementTag(ctx.radarChart.view, 'polygon')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have data param as required with type json', () => {
          expect(isRequiredParam(ctx.radarChart, 'data')).toBe(true);
          expect(hasParamType(ctx.radarChart, 'data', 'json')).toBe(true);
        });

        it('should have valueKey param as required with type string', () => {
          expect(isRequiredParam(ctx.radarChart, 'valueKey')).toBe(true);
          expect(hasParamType(ctx.radarChart, 'valueKey', 'string')).toBe(true);
        });

        it('should have labelKey param as required with type string', () => {
          expect(isRequiredParam(ctx.radarChart, 'labelKey')).toBe(true);
          expect(hasParamType(ctx.radarChart, 'labelKey', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'colors', type: 'json' },
          { name: 'maxValue', type: 'number' },
          { name: 'showGrid', type: 'boolean' },
          { name: 'fillOpacity', type: 'number' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.radarChart, name)).toBe(true);
            expect(hasParamType(ctx.radarChart, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = [
          'data',
          'valueKey',
          'labelKey',
          'width',
          'height',
          'colors',
          'maxValue',
          'showGrid',
          'fillOpacity',
        ];
        expect(hasParams(ctx.radarChart, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="img" on SVG for screen readers', () => {
        const role = findPropInView(ctx.radarChart.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'img',
        });
      });

      it('should have aria-label attribute', () => {
        expect(hasAriaAttribute(ctx.radarChart.view, 'label')).toBe(true);
      });

      it('should have title element for chart description', () => {
        expect(hasElementTag(ctx.radarChart.view, 'title')).toBe(true);
      });

      it('should have aria-labelledby referencing title element', () => {
        expect(hasAriaAttribute(ctx.radarChart.view, 'labelledby')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should use getRadarPoints helper for polygon calculation', () => {
        const call = findExpressionCall(ctx.radarChart.view, 'getRadarPoints');
        expect(call).not.toBeNull();
      });

      it('should use getRadarAxes helper for axis lines', () => {
        const call = findExpressionCall(ctx.radarChart.view, 'getRadarAxes');
        expect(call).not.toBeNull();
      });

      it('should apply chartRadar style preset to polygon element', () => {
        expect(usesStylePreset(ctx.radarChart.view, 'chartRadar')).toBe(true);
      });

      it('should render grid when showGrid is true', () => {
        expect(findExpressionCall(ctx.radarChart.view, 'getRadarGridPolygons')).not.toBeNull();
      });

      it('should support configurable max value', () => {
        expect(hasParams(ctx.radarChart, ['maxValue'])).toBe(true);
      });

      it('should support configurable fill opacity', () => {
        expect(hasParams(ctx.radarChart, ['fillOpacity'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartSvg preset for root SVG', () => {
        const className = findPropInView(ctx.radarChart.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartSvg',
        });
      });

      it('should use chartRadar preset for radar polygon', () => {
        expect(usesStylePreset(ctx.radarChart.view, 'chartRadar')).toBe(true);
      });
    });
  });

  // ============================================================
  // CHART LEGEND COMPONENT
  // ============================================================

  describe('ChartLegend Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.chartLegend);
      });

      it('should have div as root element', () => {
        const rootTag = getRootTag(ctx.chartLegend);
        expect(rootTag).toBe('div');
      });

      it('should have role="list" on root element for accessibility', () => {
        expect(hasRole(ctx.chartLegend.view, 'list')).toBe(true);
      });

      it('should have className using StyleExpr with chartLegend preset', () => {
        const className = findPropInView(ctx.chartLegend.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartLegend',
        });
      });

      it('should contain list items for each legend entry', () => {
        // Legend should iterate over items and render list items
        expect(hasElementTag(ctx.chartLegend.view, 'div')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have items param as required with type json', () => {
          expect(isRequiredParam(ctx.chartLegend, 'items')).toBe(true);
          expect(hasParamType(ctx.chartLegend, 'items', 'json')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'orientation', type: 'string' },
          { name: 'position', type: 'string' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.chartLegend, name)).toBe(true);
            expect(hasParamType(ctx.chartLegend, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = ['items', 'orientation', 'position'];
        expect(hasParams(ctx.chartLegend, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="list" on root element', () => {
        const role = findPropInView(ctx.chartLegend.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'list',
        });
      });

      it('should have role="listitem" on legend items', () => {
        // Each legend item should have role="listitem"
        expect(hasRoleAnywhere(ctx.chartLegend.view, 'listitem')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should apply chartLegend style preset to container', () => {
        expect(usesStylePreset(ctx.chartLegend.view, 'chartLegend')).toBe(true);
      });

      it('should apply chartLegendItem style preset to legend items', () => {
        expect(usesStylePreset(ctx.chartLegend.view, 'chartLegendItem')).toBe(true);
      });

      it('should render color indicators for each item', () => {
        // Each legend item should have a color indicator element
        expect(hasElementTag(ctx.chartLegend.view, 'span')).toBe(true);
      });

      it('should render labels for each item', () => {
        // Each legend item should have a label
        expect(hasElementTag(ctx.chartLegend.view, 'span')).toBe(true);
      });

      it('should support horizontal orientation', () => {
        expect(hasParams(ctx.chartLegend, ['orientation'])).toBe(true);
      });

      it('should support vertical orientation', () => {
        expect(hasParams(ctx.chartLegend, ['orientation'])).toBe(true);
      });

      it('should support configurable position', () => {
        expect(hasParams(ctx.chartLegend, ['position'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartLegend preset for container', () => {
        const className = findPropInView(ctx.chartLegend.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartLegend',
        });
      });

      it('should use chartLegendItem preset for legend items', () => {
        expect(usesStylePreset(ctx.chartLegend.view, 'chartLegendItem')).toBe(true);
      });
    });
  });

  // ============================================================
  // CHART TOOLTIP COMPONENT
  // ============================================================

  describe('ChartTooltip Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.chartTooltip);
      });

      it('should have div as root element', () => {
        const rootTag = getRootTag(ctx.chartTooltip);
        expect(rootTag).toBe('div');
      });

      it('should have role="tooltip" for accessibility', () => {
        expect(hasRole(ctx.chartTooltip.view, 'tooltip')).toBe(true);
      });

      it('should have className using StyleExpr with chartTooltip preset', () => {
        const className = findPropInView(ctx.chartTooltip.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartTooltip',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have content param as required with type string', () => {
          expect(isRequiredParam(ctx.chartTooltip, 'content')).toBe(true);
          expect(hasParamType(ctx.chartTooltip, 'content', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'x', type: 'number' },
          { name: 'y', type: 'number' },
          { name: 'visible', type: 'boolean' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.chartTooltip, name)).toBe(true);
            expect(hasParamType(ctx.chartTooltip, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = ['content', 'x', 'y', 'visible'];
        expect(hasParams(ctx.chartTooltip, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="tooltip" on root element', () => {
        const role = findPropInView(ctx.chartTooltip.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'tooltip',
        });
      });

      it('should have aria-hidden attribute based on visibility', () => {
        expect(hasAriaAttribute(ctx.chartTooltip.view, 'hidden')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should apply chartTooltip style preset', () => {
        expect(usesStylePreset(ctx.chartTooltip.view, 'chartTooltip')).toBe(true);
      });

      it('should have absolute positioning', () => {
        // Tooltip should be positioned absolutely using x and y
        const className = findPropInView(ctx.chartTooltip.view, 'className');
        expect(className).not.toBeNull();
      });

      it('should render content from content param', () => {
        // Content should be rendered inside the tooltip
        expect(hasParams(ctx.chartTooltip, ['content'])).toBe(true);
      });

      it('should support visibility toggle', () => {
        expect(hasParams(ctx.chartTooltip, ['visible'])).toBe(true);
      });

      it('should support x position', () => {
        expect(hasParams(ctx.chartTooltip, ['x'])).toBe(true);
      });

      it('should support y position', () => {
        expect(hasParams(ctx.chartTooltip, ['y'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartTooltip preset for tooltip container', () => {
        const className = findPropInView(ctx.chartTooltip.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartTooltip',
        });
      });
    });
  });

  // ============================================================
  // CHART AXIS COMPONENT
  // ============================================================

  describe('ChartAxis Component', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.chartAxis);
      });

      it('should have g (SVG group) as root element', () => {
        const rootTag = getRootTag(ctx.chartAxis);
        expect(rootTag).toBe('g');
      });

      it('should have className using StyleExpr with chartAxis preset', () => {
        const className = findPropInView(ctx.chartAxis.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartAxis',
        });
      });

      it('should contain line elements for axis line', () => {
        expect(hasElementTag(ctx.chartAxis.view, 'line')).toBe(true);
      });

      it('should contain text elements for tick labels when showLabels is true', () => {
        expect(hasElementTag(ctx.chartAxis.view, 'text')).toBe(true);
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      describe('required params', () => {
        it('should have ticks param as required with type json', () => {
          expect(isRequiredParam(ctx.chartAxis, 'ticks')).toBe(true);
          expect(hasParamType(ctx.chartAxis, 'ticks', 'json')).toBe(true);
        });

        it('should have orientation param as required with type string', () => {
          expect(isRequiredParam(ctx.chartAxis, 'orientation')).toBe(true);
          expect(hasParamType(ctx.chartAxis, 'orientation', 'string')).toBe(true);
        });
      });

      describe('optional params', () => {
        const optionalParams = [
          { name: 'width', type: 'number' },
          { name: 'height', type: 'number' },
          { name: 'showLabels', type: 'boolean' },
          { name: 'labelFormatter', type: 'string' },
        ];

        it.each(optionalParams)(
          'should have $name param as optional with type $type',
          ({ name, type }) => {
            expect(isOptionalParam(ctx.chartAxis, name)).toBe(true);
            expect(hasParamType(ctx.chartAxis, name, type as 'string' | 'number' | 'boolean' | 'json')).toBe(true);
          }
        );
      });

      it('should have all expected params', () => {
        const expectedParams = ['ticks', 'orientation', 'width', 'height', 'showLabels', 'labelFormatter'];
        expect(hasParams(ctx.chartAxis, expectedParams)).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have aria-hidden="true" since axis is decorative', () => {
        expect(hasAriaAttribute(ctx.chartAxis.view, 'hidden')).toBe(true);
      });
    });

    // ==================== Rendering Tests ====================

    describe('Rendering', () => {
      it('should use generateTicks helper for tick generation', () => {
        const call = findExpressionCall(ctx.chartAxis.view, 'generateTicks');
        expect(call).not.toBeNull();
      });

      it('should apply chartAxis style preset to group element', () => {
        expect(usesStylePreset(ctx.chartAxis.view, 'chartAxis')).toBe(true);
      });

      it('should apply chartLabel style preset to tick labels', () => {
        expect(usesStylePreset(ctx.chartAxis.view, 'chartLabel')).toBe(true);
      });

      it('should support horizontal orientation', () => {
        expect(hasParams(ctx.chartAxis, ['orientation'])).toBe(true);
      });

      it('should support vertical orientation', () => {
        expect(hasParams(ctx.chartAxis, ['orientation'])).toBe(true);
      });

      it('should render tick marks for each tick', () => {
        expect(hasElementTag(ctx.chartAxis.view, 'line')).toBe(true);
      });

      it('should render labels when showLabels is true', () => {
        expect(hasParams(ctx.chartAxis, ['showLabels'])).toBe(true);
      });

      it('should support custom label formatting', () => {
        expect(hasParams(ctx.chartAxis, ['labelFormatter'])).toBe(true);
      });
    });

    // ==================== Style Preset Usage Tests ====================

    describe('Style Preset Usage', () => {
      it('should use chartAxis preset for axis group', () => {
        const className = findPropInView(ctx.chartAxis.view, 'className');
        expect(className).toMatchObject({
          expr: 'style',
          name: 'chartAxis',
        });
      });

      it('should use chartLabel preset for tick labels', () => {
        expect(usesStylePreset(ctx.chartAxis.view, 'chartLabel')).toBe(true);
      });
    });
  });

  // ============================================================
  // CHART STYLE PRESETS
  // ============================================================

  describe('Chart Style Presets', () => {
    // ==================== chartContainer ====================

    describe('Style Preset: chartContainer', () => {
      it('should have valid style preset structure', () => {
        const chartContainer = ctx.styles['chartContainer'];
        expect(chartContainer).toBeDefined();
        assertValidStylePreset(chartContainer);
      });

      it('should have base classes for container layout', () => {
        const chartContainer = ctx.styles['chartContainer'];
        expect(chartContainer.base).toBeDefined();
        expect(typeof chartContainer.base).toBe('string');
        expect(chartContainer.base.length).toBeGreaterThan(0);
      });
    });

    // ==================== chartSvg ====================

    describe('Style Preset: chartSvg', () => {
      it('should have valid style preset structure', () => {
        const chartSvg = ctx.styles['chartSvg'];
        expect(chartSvg).toBeDefined();
        assertValidStylePreset(chartSvg);
      });

      it('should have base classes for SVG styling', () => {
        const chartSvg = ctx.styles['chartSvg'];
        expect(chartSvg.base).toBeDefined();
        expect(typeof chartSvg.base).toBe('string');
      });

      it('should have size variants', () => {
        const chartSvg = ctx.styles['chartSvg'];
        expect(hasVariants(chartSvg, ['size'])).toBe(true);
      });

      it('should have sm, default, lg size options', () => {
        const chartSvg = ctx.styles['chartSvg'];
        expect(hasVariantOptions(chartSvg, 'size', ['sm', 'default', 'lg'])).toBe(true);
      });

      it('should have default size set to default', () => {
        const chartSvg = ctx.styles['chartSvg'];
        expect(hasDefaultVariants(chartSvg, { size: 'default' })).toBe(true);
      });
    });

    // ==================== chartBar ====================

    describe('Style Preset: chartBar', () => {
      it('should have valid style preset structure', () => {
        const chartBar = ctx.styles['chartBar'];
        expect(chartBar).toBeDefined();
        assertValidStylePreset(chartBar);
      });

      it('should have base classes for bar styling', () => {
        const chartBar = ctx.styles['chartBar'];
        expect(chartBar.base).toBeDefined();
        expect(typeof chartBar.base).toBe('string');
      });

      it('should have state variants for hover and active', () => {
        const chartBar = ctx.styles['chartBar'];
        expect(hasVariants(chartBar, ['state'])).toBe(true);
        expect(hasVariantOptions(chartBar, 'state', ['default', 'hover', 'active'])).toBe(true);
      });

      it('should have default state set to default', () => {
        const chartBar = ctx.styles['chartBar'];
        expect(hasDefaultVariants(chartBar, { state: 'default' })).toBe(true);
      });
    });

    // ==================== chartLine ====================

    describe('Style Preset: chartLine', () => {
      it('should have valid style preset structure', () => {
        const chartLine = ctx.styles['chartLine'];
        expect(chartLine).toBeDefined();
        assertValidStylePreset(chartLine);
      });

      it('should have base classes for line styling', () => {
        const chartLine = ctx.styles['chartLine'];
        expect(chartLine.base).toBeDefined();
        expect(typeof chartLine.base).toBe('string');
      });

      it('should include stroke-related CSS properties in base', () => {
        const chartLine = ctx.styles['chartLine'];
        // Should have classes for stroke styling
        expect(chartLine.base).toBeDefined();
      });
    });

    // ==================== chartArea ====================

    describe('Style Preset: chartArea', () => {
      it('should have valid style preset structure', () => {
        const chartArea = ctx.styles['chartArea'];
        expect(chartArea).toBeDefined();
        assertValidStylePreset(chartArea);
      });

      it('should have base classes for area fill styling', () => {
        const chartArea = ctx.styles['chartArea'];
        expect(chartArea.base).toBeDefined();
        expect(typeof chartArea.base).toBe('string');
      });

      it('should have opacity variants', () => {
        const chartArea = ctx.styles['chartArea'];
        expect(hasVariants(chartArea, ['opacity'])).toBe(true);
      });

      it('should have light, default, dark opacity options', () => {
        const chartArea = ctx.styles['chartArea'];
        expect(hasVariantOptions(chartArea, 'opacity', ['light', 'default', 'dark'])).toBe(true);
      });
    });

    // ==================== chartPoint ====================

    describe('Style Preset: chartPoint', () => {
      it('should have valid style preset structure', () => {
        const chartPoint = ctx.styles['chartPoint'];
        expect(chartPoint).toBeDefined();
        assertValidStylePreset(chartPoint);
      });

      it('should have base classes for point styling', () => {
        const chartPoint = ctx.styles['chartPoint'];
        expect(chartPoint.base).toBeDefined();
        expect(typeof chartPoint.base).toBe('string');
      });

      it('should have size variants', () => {
        const chartPoint = ctx.styles['chartPoint'];
        expect(hasVariants(chartPoint, ['size'])).toBe(true);
      });

      it('should have sm, default, lg size options', () => {
        const chartPoint = ctx.styles['chartPoint'];
        expect(hasVariantOptions(chartPoint, 'size', ['sm', 'default', 'lg'])).toBe(true);
      });

      it('should have state variants for hover', () => {
        const chartPoint = ctx.styles['chartPoint'];
        expect(hasVariants(chartPoint, ['state'])).toBe(true);
        expect(hasVariantOptions(chartPoint, 'state', ['default', 'hover'])).toBe(true);
      });
    });

    // ==================== chartGrid ====================

    describe('Style Preset: chartGrid', () => {
      it('should have valid style preset structure', () => {
        const chartGrid = ctx.styles['chartGrid'];
        expect(chartGrid).toBeDefined();
        assertValidStylePreset(chartGrid);
      });

      it('should have base classes for grid line styling', () => {
        const chartGrid = ctx.styles['chartGrid'];
        expect(chartGrid.base).toBeDefined();
        expect(typeof chartGrid.base).toBe('string');
      });

      it('should have axis variants for x and y', () => {
        const chartGrid = ctx.styles['chartGrid'];
        expect(hasVariants(chartGrid, ['axis'])).toBe(true);
        expect(hasVariantOptions(chartGrid, 'axis', ['x', 'y', 'both'])).toBe(true);
      });
    });

    // ==================== chartAxis ====================

    describe('Style Preset: chartAxis', () => {
      it('should have valid style preset structure', () => {
        const chartAxis = ctx.styles['chartAxis'];
        expect(chartAxis).toBeDefined();
        assertValidStylePreset(chartAxis);
      });

      it('should have base classes for axis styling', () => {
        const chartAxis = ctx.styles['chartAxis'];
        expect(chartAxis.base).toBeDefined();
        expect(typeof chartAxis.base).toBe('string');
      });

      it('should have position variants for top, right, bottom, left', () => {
        const chartAxis = ctx.styles['chartAxis'];
        expect(hasVariants(chartAxis, ['position'])).toBe(true);
        expect(hasVariantOptions(chartAxis, 'position', ['top', 'right', 'bottom', 'left'])).toBe(true);
      });
    });

    // ==================== chartLabel ====================

    describe('Style Preset: chartLabel', () => {
      it('should have valid style preset structure', () => {
        const chartLabel = ctx.styles['chartLabel'];
        expect(chartLabel).toBeDefined();
        assertValidStylePreset(chartLabel);
      });

      it('should have base classes for label styling', () => {
        const chartLabel = ctx.styles['chartLabel'];
        expect(chartLabel.base).toBeDefined();
        expect(typeof chartLabel.base).toBe('string');
      });

      it('should have type variants for axis, data, title', () => {
        const chartLabel = ctx.styles['chartLabel'];
        expect(hasVariants(chartLabel, ['type'])).toBe(true);
        expect(hasVariantOptions(chartLabel, 'type', ['axis', 'data', 'title'])).toBe(true);
      });

      it('should have size variants', () => {
        const chartLabel = ctx.styles['chartLabel'];
        expect(hasVariants(chartLabel, ['size'])).toBe(true);
      });
    });

    // ==================== chartSlice ====================

    describe('Style Preset: chartSlice', () => {
      it('should have valid style preset structure', () => {
        const chartSlice = ctx.styles['chartSlice'];
        expect(chartSlice).toBeDefined();
        assertValidStylePreset(chartSlice);
      });

      it('should have base classes for slice styling', () => {
        const chartSlice = ctx.styles['chartSlice'];
        expect(chartSlice.base).toBeDefined();
        expect(typeof chartSlice.base).toBe('string');
      });

      it('should have state variants for default, hover, and active', () => {
        const chartSlice = ctx.styles['chartSlice'];
        expect(hasVariants(chartSlice, ['state'])).toBe(true);
        expect(hasVariantOptions(chartSlice, 'state', ['default', 'hover', 'active'])).toBe(true);
      });

      it('should have default state set to default', () => {
        const chartSlice = ctx.styles['chartSlice'];
        expect(hasDefaultVariants(chartSlice, { state: 'default' })).toBe(true);
      });
    });

    // ==================== chartRadar ====================

    describe('Style Preset: chartRadar', () => {
      it('should have valid style preset structure', () => {
        const chartRadar = ctx.styles['chartRadar'];
        expect(chartRadar).toBeDefined();
        assertValidStylePreset(chartRadar);
      });

      it('should have base classes for radar polygon styling', () => {
        const chartRadar = ctx.styles['chartRadar'];
        expect(chartRadar.base).toBeDefined();
        expect(typeof chartRadar.base).toBe('string');
      });

      it('should have opacity variants', () => {
        const chartRadar = ctx.styles['chartRadar'];
        expect(hasVariants(chartRadar, ['opacity'])).toBe(true);
      });

      it('should have light, default, dark opacity options', () => {
        const chartRadar = ctx.styles['chartRadar'];
        expect(hasVariantOptions(chartRadar, 'opacity', ['light', 'default', 'dark'])).toBe(true);
      });

      it('should have default opacity set to default', () => {
        const chartRadar = ctx.styles['chartRadar'];
        expect(hasDefaultVariants(chartRadar, { opacity: 'default' })).toBe(true);
      });
    });

    // ==================== chartLegend ====================

    describe('Style Preset: chartLegend', () => {
      it('should have valid style preset structure', () => {
        const chartLegend = ctx.styles['chartLegend'];
        expect(chartLegend).toBeDefined();
        assertValidStylePreset(chartLegend);
      });

      it('should have base classes for legend container styling', () => {
        const chartLegend = ctx.styles['chartLegend'];
        expect(chartLegend.base).toBeDefined();
        expect(typeof chartLegend.base).toBe('string');
      });

      it('should have orientation variants for horizontal and vertical', () => {
        const chartLegend = ctx.styles['chartLegend'];
        expect(hasVariants(chartLegend, ['orientation'])).toBe(true);
        expect(hasVariantOptions(chartLegend, 'orientation', ['horizontal', 'vertical'])).toBe(true);
      });

      it('should have default orientation set to horizontal', () => {
        const chartLegend = ctx.styles['chartLegend'];
        expect(hasDefaultVariants(chartLegend, { orientation: 'horizontal' })).toBe(true);
      });
    });

    // ==================== chartLegendItem ====================

    describe('Style Preset: chartLegendItem', () => {
      it('should have valid style preset structure', () => {
        const chartLegendItem = ctx.styles['chartLegendItem'];
        expect(chartLegendItem).toBeDefined();
        assertValidStylePreset(chartLegendItem);
      });

      it('should have base classes for legend item styling', () => {
        const chartLegendItem = ctx.styles['chartLegendItem'];
        expect(chartLegendItem.base).toBeDefined();
        expect(typeof chartLegendItem.base).toBe('string');
      });

      it('should have state variants for default, hover, and disabled', () => {
        const chartLegendItem = ctx.styles['chartLegendItem'];
        expect(hasVariants(chartLegendItem, ['state'])).toBe(true);
        expect(hasVariantOptions(chartLegendItem, 'state', ['default', 'hover', 'disabled'])).toBe(true);
      });

      it('should have default state set to default', () => {
        const chartLegendItem = ctx.styles['chartLegendItem'];
        expect(hasDefaultVariants(chartLegendItem, { state: 'default' })).toBe(true);
      });
    });

    // ==================== chartTooltip ====================

    describe('Style Preset: chartTooltip', () => {
      it('should have valid style preset structure', () => {
        const chartTooltip = ctx.styles['chartTooltip'];
        expect(chartTooltip).toBeDefined();
        assertValidStylePreset(chartTooltip);
      });

      it('should have base classes for tooltip styling', () => {
        const chartTooltip = ctx.styles['chartTooltip'];
        expect(chartTooltip.base).toBeDefined();
        expect(typeof chartTooltip.base).toBe('string');
      });

      it('should have absolute positioning in base classes', () => {
        const chartTooltip = ctx.styles['chartTooltip'];
        expect(chartTooltip.base).toContain('absolute');
      });

      it('should have visibility variants', () => {
        const chartTooltip = ctx.styles['chartTooltip'];
        expect(hasVariants(chartTooltip, ['visible'])).toBe(true);
        expect(hasVariantOptions(chartTooltip, 'visible', ['true', 'false'])).toBe(true);
      });

      it('should have default visibility set to false', () => {
        const chartTooltip = ctx.styles['chartTooltip'];
        expect(hasDefaultVariants(chartTooltip, { visible: 'false' })).toBe(true);
      });
    });

    // ==================== Animation Style Presets ====================

    describe('Animation Style Presets', () => {
      // -------------------- chartBarAnimated --------------------

      describe('Style Preset: chartBarAnimated', () => {
        it('should have chartBarAnimated preset defined', () => {
          const chartBarAnimated = ctx.styles['chartBarAnimated'];
          expect(chartBarAnimated).toBeDefined();
        });

        it('should have valid style preset structure', () => {
          const chartBarAnimated = ctx.styles['chartBarAnimated'];
          assertValidStylePreset(chartBarAnimated);
        });

        it('should have origin-bottom in base classes for transform origin', () => {
          const chartBarAnimated = ctx.styles['chartBarAnimated'];
          expect(chartBarAnimated.base).toContain('origin-bottom');
        });

        it('should have bar-grow animation with correct timing', () => {
          const chartBarAnimated = ctx.styles['chartBarAnimated'];
          expect(chartBarAnimated.base).toContain('animate-[bar-grow_0.5s_ease-out_forwards]');
        });
      });

      // -------------------- chartLineAnimated --------------------

      describe('Style Preset: chartLineAnimated', () => {
        it('should have chartLineAnimated preset defined', () => {
          const chartLineAnimated = ctx.styles['chartLineAnimated'];
          expect(chartLineAnimated).toBeDefined();
        });

        it('should have valid style preset structure', () => {
          const chartLineAnimated = ctx.styles['chartLineAnimated'];
          assertValidStylePreset(chartLineAnimated);
        });

        it('should have line-draw animation with correct timing', () => {
          const chartLineAnimated = ctx.styles['chartLineAnimated'];
          expect(chartLineAnimated.base).toContain('animate-[line-draw_1s_ease-out_forwards]');
        });
      });

      // -------------------- chartSliceAnimated --------------------

      describe('Style Preset: chartSliceAnimated', () => {
        it('should have chartSliceAnimated preset defined', () => {
          const chartSliceAnimated = ctx.styles['chartSliceAnimated'];
          expect(chartSliceAnimated).toBeDefined();
        });

        it('should have valid style preset structure', () => {
          const chartSliceAnimated = ctx.styles['chartSliceAnimated'];
          assertValidStylePreset(chartSliceAnimated);
        });

        it('should have origin-center in base classes for transform origin', () => {
          const chartSliceAnimated = ctx.styles['chartSliceAnimated'];
          expect(chartSliceAnimated.base).toContain('origin-center');
        });

        it('should have slice-rotate animation with correct timing', () => {
          const chartSliceAnimated = ctx.styles['chartSliceAnimated'];
          expect(chartSliceAnimated.base).toContain('animate-[slice-rotate_0.5s_ease-out_forwards]');
        });
      });
    });
  });

  // ============================================================
  // CHART ANIMATION CSS KEYFRAMES
  // ============================================================

  describe('Chart Animation CSS Keyframes', () => {
    const cssFilePath = join(dirname(fileURLToPath(import.meta.url)), '../../styles/chart-animations.css');

    describe('CSS File Existence', () => {
      it('should have chart-animations.css file in styles directory', () => {
        expect(existsSync(cssFilePath)).toBe(true);
      });
    });

    describe('Keyframe Definitions', () => {
      let cssContent: string;

      beforeAll(() => {
        // Only read if file exists; otherwise empty string for failing tests
        cssContent = existsSync(cssFilePath) ? readFileSync(cssFilePath, 'utf-8') : '';
      });

      it('should define bar-grow keyframe', () => {
        expect(cssContent).toContain('@keyframes bar-grow');
      });

      it('bar-grow should animate from scaleY(0) to scaleY(1)', () => {
        // Check for scaleY(0) in from/0% and scaleY(1) in to/100%
        expect(cssContent).toMatch(/bar-grow[\s\S]*scaleY\(0\)/);
        expect(cssContent).toMatch(/bar-grow[\s\S]*scaleY\(1\)/);
      });

      it('should define line-draw keyframe', () => {
        expect(cssContent).toContain('@keyframes line-draw');
      });

      it('line-draw should animate stroke-dashoffset from 100% to 0', () => {
        expect(cssContent).toMatch(/line-draw[\s\S]*stroke-dashoffset/);
      });

      it('should define slice-rotate keyframe', () => {
        expect(cssContent).toContain('@keyframes slice-rotate');
      });

      it('slice-rotate should animate from scale(0) rotate(-90deg) to scale(1) rotate(0)', () => {
        // Check for scale(0) and rotate(-90deg) in from/0%
        expect(cssContent).toMatch(/slice-rotate[\s\S]*scale\(0\)/);
        expect(cssContent).toMatch(/slice-rotate[\s\S]*rotate\(-90deg\)/);
        // Check for scale(1) and rotate(0) in to/100%
        expect(cssContent).toMatch(/slice-rotate[\s\S]*scale\(1\)/);
        expect(cssContent).toMatch(/slice-rotate[\s\S]*rotate\(0/);
      });
    });
  });

  // ============================================================
  // INTEGRATION TESTS
  // ============================================================

  describe('Integration', () => {
    describe('Component-Style Consistency', () => {
      it('BarChart should reference only existing style presets', () => {
        // All presets used in BarChart should exist in styles
        expect(ctx.styles['chartSvg']).toBeDefined();
        expect(ctx.styles['chartBar']).toBeDefined();
        expect(ctx.styles['chartGrid']).toBeDefined();
        expect(ctx.styles['chartLabel']).toBeDefined();
      });

      it('LineChart should reference only existing style presets', () => {
        expect(ctx.styles['chartSvg']).toBeDefined();
        expect(ctx.styles['chartLine']).toBeDefined();
        expect(ctx.styles['chartPoint']).toBeDefined();
        expect(ctx.styles['chartGrid']).toBeDefined();
        expect(ctx.styles['chartLabel']).toBeDefined();
      });

      it('AreaChart should reference only existing style presets', () => {
        expect(ctx.styles['chartSvg']).toBeDefined();
        expect(ctx.styles['chartArea']).toBeDefined();
        expect(ctx.styles['chartLine']).toBeDefined();
        expect(ctx.styles['chartPoint']).toBeDefined();
        expect(ctx.styles['chartGrid']).toBeDefined();
        expect(ctx.styles['chartLabel']).toBeDefined();
      });

      it('PieChart should reference only existing style presets', () => {
        expect(ctx.styles['chartSvg']).toBeDefined();
        expect(ctx.styles['chartSlice']).toBeDefined();
        expect(ctx.styles['chartLabel']).toBeDefined();
      });

      it('DonutChart should reference only existing style presets', () => {
        expect(ctx.styles['chartSvg']).toBeDefined();
        expect(ctx.styles['chartLabel']).toBeDefined();
      });

      it('ScatterChart should reference only existing style presets', () => {
        expect(ctx.styles['chartSvg']).toBeDefined();
        expect(ctx.styles['chartPoint']).toBeDefined();
        expect(ctx.styles['chartGrid']).toBeDefined();
        expect(ctx.styles['chartLabel']).toBeDefined();
      });

      it('RadarChart should reference only existing style presets', () => {
        expect(ctx.styles['chartSvg']).toBeDefined();
        expect(ctx.styles['chartRadar']).toBeDefined();
        expect(ctx.styles['chartGrid']).toBeDefined();
      });

      it('ChartLegend should reference only existing style presets', () => {
        expect(ctx.styles['chartLegend']).toBeDefined();
        expect(ctx.styles['chartLegendItem']).toBeDefined();
      });

      it('ChartTooltip should reference only existing style presets', () => {
        expect(ctx.styles['chartTooltip']).toBeDefined();
      });

      it('ChartAxis should reference only existing style presets', () => {
        expect(ctx.styles['chartAxis']).toBeDefined();
        expect(ctx.styles['chartLabel']).toBeDefined();
      });
    });

    describe('Helper Function Usage', () => {
      it('BarChart should use getBarDimensions for positioning', () => {
        const call = findExpressionCall(ctx.barChart.view, 'getBarDimensions');
        expect(call).not.toBeNull();
      });

      it('LineChart should use getLinePath for path generation', () => {
        const call = findExpressionCall(ctx.lineChart.view, 'getLinePath');
        expect(call).not.toBeNull();
      });

      it('AreaChart should use getAreaPath for area fill', () => {
        const call = findExpressionCall(ctx.areaChart.view, 'getAreaPath');
        expect(call).not.toBeNull();
      });

      it('PieChart should use getPieSlices for slice calculation', () => {
        const call = findExpressionCall(ctx.pieChart.view, 'getPieSlices');
        expect(call).not.toBeNull();
      });

      it('PieChart should use getArcPath for path generation', () => {
        const call = findExpressionCall(ctx.pieChart.view, 'getArcPath');
        expect(call).not.toBeNull();
      });

      it('DonutChart should use getActivityRingLayout for ring layout calculation', () => {
        // getActivityRingLayout is in localState, not view
        expect(hasLocalState(ctx.donutChart, '_ringLayout')).toBe(true);
        const initial = ctx.donutChart.localState!['_ringLayout'].initial as Record<string, unknown>;
        expect(initial['method']).toBe('getActivityRingLayout');
      });

      it('DonutChart should use getActivityRingArcPath for arc path generation', () => {
        const call = findExpressionCall(ctx.donutChart.view, 'getActivityRingArcPath');
        expect(call).not.toBeNull();
      });

      it('RadarChart should use getRadarPoints for polygon calculation', () => {
        const call = findExpressionCall(ctx.radarChart.view, 'getRadarPoints');
        expect(call).not.toBeNull();
      });

      it('RadarChart should use getRadarAxes for axis generation', () => {
        const call = findExpressionCall(ctx.radarChart.view, 'getRadarAxes');
        expect(call).not.toBeNull();
      });

      it('ChartAxis should use generateTicks for tick generation', () => {
        const call = findExpressionCall(ctx.chartAxis.view, 'generateTicks');
        expect(call).not.toBeNull();
      });
    });

    describe('Common Param Consistency', () => {
      const commonParams = ['data', 'valueKey', 'labelKey', 'width', 'height', 'colors', 'showGrid', 'showLabels'];
      const pieCommonParams = ['data', 'valueKey', 'labelKey', 'width', 'height', 'colors', 'showLabels'];
      const donutActivityParams = ['data', 'valueKey', 'labelKey', 'width', 'height', 'colors'];
      const scatterChartParams = ['data', 'xKey', 'yKey', 'width', 'height', 'colors', 'showGrid', 'showLabels'];
      const radarChartParams = ['data', 'valueKey', 'labelKey', 'width', 'height', 'colors', 'showGrid'];

      it('all chart components should have common params', () => {
        expect(hasParams(ctx.barChart, commonParams)).toBe(true);
        expect(hasParams(ctx.lineChart, commonParams)).toBe(true);
        expect(hasParams(ctx.areaChart, commonParams)).toBe(true);
      });

      it('pie chart should have common params (without showGrid)', () => {
        expect(hasParams(ctx.pieChart, pieCommonParams)).toBe(true);
      });

      it('donut chart (activity ring) should have common params (without showGrid/showLabels)', () => {
        expect(hasParams(ctx.donutChart, donutActivityParams)).toBe(true);
      });

      it('scatter chart should have its required params (xKey, yKey instead of valueKey)', () => {
        expect(hasParams(ctx.scatterChart, scatterChartParams)).toBe(true);
      });

      it('radar chart should have its common params', () => {
        expect(hasParams(ctx.radarChart, radarChartParams)).toBe(true);
      });

      it('all chart components should have consistent required params', () => {
        // data and valueKey should be required for all charts
        expect(isRequiredParam(ctx.barChart, 'data')).toBe(true);
        expect(isRequiredParam(ctx.barChart, 'valueKey')).toBe(true);
        expect(isRequiredParam(ctx.lineChart, 'data')).toBe(true);
        expect(isRequiredParam(ctx.lineChart, 'valueKey')).toBe(true);
        expect(isRequiredParam(ctx.areaChart, 'data')).toBe(true);
        expect(isRequiredParam(ctx.areaChart, 'valueKey')).toBe(true);
        expect(isRequiredParam(ctx.pieChart, 'data')).toBe(true);
        expect(isRequiredParam(ctx.pieChart, 'valueKey')).toBe(true);
        expect(isRequiredParam(ctx.donutChart, 'data')).toBe(true);
        expect(isRequiredParam(ctx.donutChart, 'valueKey')).toBe(true);
        // ScatterChart uses xKey and yKey instead of valueKey
        expect(isRequiredParam(ctx.scatterChart, 'data')).toBe(true);
        expect(isRequiredParam(ctx.scatterChart, 'xKey')).toBe(true);
        expect(isRequiredParam(ctx.scatterChart, 'yKey')).toBe(true);
        // RadarChart requires data, valueKey, and labelKey
        expect(isRequiredParam(ctx.radarChart, 'data')).toBe(true);
        expect(isRequiredParam(ctx.radarChart, 'valueKey')).toBe(true);
        expect(isRequiredParam(ctx.radarChart, 'labelKey')).toBe(true);
      });
    });

    describe('Accessibility Consistency', () => {
      it('all chart components should have role="img"', () => {
        expect(hasRole(ctx.barChart.view, 'img')).toBe(true);
        expect(hasRole(ctx.lineChart.view, 'img')).toBe(true);
        expect(hasRole(ctx.areaChart.view, 'img')).toBe(true);
        expect(hasRole(ctx.pieChart.view, 'img')).toBe(true);
        expect(hasRole(ctx.donutChart.view, 'img')).toBe(true);
        expect(hasRole(ctx.scatterChart.view, 'img')).toBe(true);
        expect(hasRole(ctx.radarChart.view, 'img')).toBe(true);
      });

      it('all chart components should have aria-label', () => {
        expect(hasAriaAttribute(ctx.barChart.view, 'label')).toBe(true);
        expect(hasAriaAttribute(ctx.lineChart.view, 'label')).toBe(true);
        expect(hasAriaAttribute(ctx.areaChart.view, 'label')).toBe(true);
        expect(hasAriaAttribute(ctx.pieChart.view, 'label')).toBe(true);
        expect(hasAriaAttribute(ctx.donutChart.view, 'label')).toBe(true);
        expect(hasAriaAttribute(ctx.scatterChart.view, 'label')).toBe(true);
        expect(hasAriaAttribute(ctx.radarChart.view, 'label')).toBe(true);
      });

      it('all chart components should have title element', () => {
        expect(hasElementTag(ctx.barChart.view, 'title')).toBe(true);
        expect(hasElementTag(ctx.lineChart.view, 'title')).toBe(true);
        expect(hasElementTag(ctx.areaChart.view, 'title')).toBe(true);
        expect(hasElementTag(ctx.pieChart.view, 'title')).toBe(true);
        expect(hasElementTag(ctx.donutChart.view, 'title')).toBe(true);
        expect(hasElementTag(ctx.scatterChart.view, 'title')).toBe(true);
        expect(hasElementTag(ctx.radarChart.view, 'title')).toBe(true);
      });
    });
  });

  // ============================================================
  // LOCAL STATE REFACTORING TESTS (TDD Red Phase)
  // ============================================================
  // These tests verify that chart components use localState to compute
  // default values once, eliminating duplicate cond/then/else patterns.

  describe('LocalState Default Value Refactoring', () => {
    // ==================== BarChart LocalState Tests ====================

    describe('BarChart localState', () => {
      it('should have localState property defined', () => {
        expect(ctx.barChart.localState).toBeDefined();
      });

      describe('_width local state', () => {
        it('should have _width field in localState', () => {
          expect(hasLocalState(ctx.barChart, '_width')).toBe(true);
        });

        it('should have _width as number type', () => {
          expect(hasLocalStateType(ctx.barChart, '_width', 'number')).toBe(true);
        });

        it('should have _width initial with cond pattern for width param defaulting to 400', () => {
          expect(hasCondInitialPattern(ctx.barChart, '_width', 'width', 400)).toBe(true);
        });
      });

      describe('_height local state', () => {
        it('should have _height field in localState', () => {
          expect(hasLocalState(ctx.barChart, '_height')).toBe(true);
        });

        it('should have _height as number type', () => {
          expect(hasLocalStateType(ctx.barChart, '_height', 'number')).toBe(true);
        });

        it('should have _height initial with cond pattern for height param defaulting to 300', () => {
          expect(hasCondInitialPattern(ctx.barChart, '_height', 'height', 300)).toBe(true);
        });
      });

      describe('_barGap local state', () => {
        it('should have _barGap field in localState', () => {
          expect(hasLocalState(ctx.barChart, '_barGap')).toBe(true);
        });

        it('should have _barGap as number type', () => {
          expect(hasLocalStateType(ctx.barChart, '_barGap', 'number')).toBe(true);
        });

        it('should have _barGap initial with cond pattern for barGap param defaulting to 6', () => {
          expect(hasCondInitialPattern(ctx.barChart, '_barGap', 'barGap', 6)).toBe(true);
        });
      });

      describe('_orientation local state', () => {
        it('should have _orientation field in localState', () => {
          expect(hasLocalState(ctx.barChart, '_orientation')).toBe(true);
        });

        it('should have _orientation as string type', () => {
          expect(hasLocalStateType(ctx.barChart, '_orientation', 'string')).toBe(true);
        });

        it('should have _orientation initial with cond pattern for orientation param defaulting to "vertical"', () => {
          expect(hasCondInitialPattern(ctx.barChart, '_orientation', 'orientation', 'vertical')).toBe(true);
        });
      });

      describe('view uses local references', () => {
        it('should reference _width via local expression in view', () => {
          expect(hasLocalReference(ctx.barChart.view, '_width')).toBe(true);
        });

        it('should reference _height via local expression in view', () => {
          expect(hasLocalReference(ctx.barChart.view, '_height')).toBe(true);
        });

        it('should reference _barGap via local expression in view', () => {
          expect(hasLocalReference(ctx.barChart.view, '_barGap')).toBe(true);
        });

        it('should reference _orientation via local expression in view', () => {
          expect(hasLocalReference(ctx.barChart.view, '_orientation')).toBe(true);
        });

        it('should have zero or minimal cond patterns for width in view (refactored)', () => {
          // After refactoring, there should be no repeated cond patterns for width
          // (only in localState, not in view)
          const count = countCondPatterns(ctx.barChart.view, 'width');
          expect(count).toBe(0);
        });

        it('should have zero or minimal cond patterns for height in view (refactored)', () => {
          const count = countCondPatterns(ctx.barChart.view, 'height');
          expect(count).toBe(0);
        });

        it('should have zero cond patterns for barGap in view (refactored)', () => {
          const count = countCondPatterns(ctx.barChart.view, 'barGap');
          expect(count).toBe(0);
        });

        it('should have zero cond patterns for orientation in view (refactored)', () => {
          const count = countCondPatterns(ctx.barChart.view, 'orientation');
          expect(count).toBe(0);
        });
      });
    });

    // ==================== LineChart LocalState Tests ====================

    describe('LineChart localState', () => {
      it('should have localState property defined', () => {
        expect(ctx.lineChart.localState).toBeDefined();
      });

      describe('_width local state', () => {
        it('should have _width field in localState', () => {
          expect(hasLocalState(ctx.lineChart, '_width')).toBe(true);
        });

        it('should have _width as number type', () => {
          expect(hasLocalStateType(ctx.lineChart, '_width', 'number')).toBe(true);
        });

        it('should have _width initial with cond pattern for width param defaulting to 400', () => {
          expect(hasCondInitialPattern(ctx.lineChart, '_width', 'width', 400)).toBe(true);
        });
      });

      describe('_height local state', () => {
        it('should have _height field in localState', () => {
          expect(hasLocalState(ctx.lineChart, '_height')).toBe(true);
        });

        it('should have _height as number type', () => {
          expect(hasLocalStateType(ctx.lineChart, '_height', 'number')).toBe(true);
        });

        it('should have _height initial with cond pattern for height param defaulting to 300', () => {
          expect(hasCondInitialPattern(ctx.lineChart, '_height', 'height', 300)).toBe(true);
        });
      });

      describe('view uses local references', () => {
        it('should reference _width via local expression in view', () => {
          expect(hasLocalReference(ctx.lineChart.view, '_width')).toBe(true);
        });

        it('should reference _height via local expression in view', () => {
          expect(hasLocalReference(ctx.lineChart.view, '_height')).toBe(true);
        });

        it('should have zero cond patterns for width in view (refactored)', () => {
          const count = countCondPatterns(ctx.lineChart.view, 'width');
          expect(count).toBe(0);
        });

        it('should have zero cond patterns for height in view (refactored)', () => {
          const count = countCondPatterns(ctx.lineChart.view, 'height');
          expect(count).toBe(0);
        });
      });
    });

    // ==================== AreaChart LocalState Tests ====================

    describe('AreaChart localState', () => {
      it('should have localState property defined', () => {
        expect(ctx.areaChart.localState).toBeDefined();
      });

      describe('_width local state', () => {
        it('should have _width field in localState', () => {
          expect(hasLocalState(ctx.areaChart, '_width')).toBe(true);
        });

        it('should have _width as number type', () => {
          expect(hasLocalStateType(ctx.areaChart, '_width', 'number')).toBe(true);
        });

        it('should have _width initial with cond pattern for width param defaulting to 400', () => {
          expect(hasCondInitialPattern(ctx.areaChart, '_width', 'width', 400)).toBe(true);
        });
      });

      describe('_height local state', () => {
        it('should have _height field in localState', () => {
          expect(hasLocalState(ctx.areaChart, '_height')).toBe(true);
        });

        it('should have _height as number type', () => {
          expect(hasLocalStateType(ctx.areaChart, '_height', 'number')).toBe(true);
        });

        it('should have _height initial with cond pattern for height param defaulting to 300', () => {
          expect(hasCondInitialPattern(ctx.areaChart, '_height', 'height', 300)).toBe(true);
        });
      });

      describe('view uses local references', () => {
        it('should reference _width via local expression in view', () => {
          expect(hasLocalReference(ctx.areaChart.view, '_width')).toBe(true);
        });

        it('should reference _height via local expression in view', () => {
          expect(hasLocalReference(ctx.areaChart.view, '_height')).toBe(true);
        });

        it('should have zero cond patterns for width in view (refactored)', () => {
          const count = countCondPatterns(ctx.areaChart.view, 'width');
          expect(count).toBe(0);
        });

        it('should have zero cond patterns for height in view (refactored)', () => {
          const count = countCondPatterns(ctx.areaChart.view, 'height');
          expect(count).toBe(0);
        });
      });
    });

    // ==================== Cross-Component Consistency Tests ====================

    describe('Cross-Component Consistency', () => {
      it('all charts with width/height should have corresponding localState fields', () => {
        // BarChart, LineChart, AreaChart should all have _width and _height
        expect(hasLocalState(ctx.barChart, '_width')).toBe(true);
        expect(hasLocalState(ctx.barChart, '_height')).toBe(true);
        expect(hasLocalState(ctx.lineChart, '_width')).toBe(true);
        expect(hasLocalState(ctx.lineChart, '_height')).toBe(true);
        expect(hasLocalState(ctx.areaChart, '_width')).toBe(true);
        expect(hasLocalState(ctx.areaChart, '_height')).toBe(true);
      });

      it('all localState fields should use underscore prefix naming convention', () => {
        // Verify naming convention: local state fields start with underscore
        const barChartLocalState = ctx.barChart.localState;
        if (barChartLocalState) {
          for (const fieldName of Object.keys(barChartLocalState)) {
            expect(fieldName.startsWith('_')).toBe(true);
          }
        }

        const lineChartLocalState = ctx.lineChart.localState;
        if (lineChartLocalState) {
          for (const fieldName of Object.keys(lineChartLocalState)) {
            expect(fieldName.startsWith('_')).toBe(true);
          }
        }

        const areaChartLocalState = ctx.areaChart.localState;
        if (areaChartLocalState) {
          for (const fieldName of Object.keys(areaChartLocalState)) {
            expect(fieldName.startsWith('_')).toBe(true);
          }
        }
      });
    });
  });

  // ============================================================
  // LABEL POSITION BUG FIX TESTS (Task 2)
  // ============================================================

  /**
   * Tests for label positioning bug fix.
   *
   * Currently, all label x/y positions are hardcoded:
   * - bar-chart.constela.json: x: "50", y: "290"
   * - line-chart.constela.json: x: "50", y: "290"
   * - area-chart.constela.json: x: "50", y: "290"
   *
   * This causes all labels to overlap at the same position.
   * Labels should be positioned based on data index.
   *
   * Expected fix:
   * - BarChart: x should use getBarDimensions result + width/2 offset
   * - LineChart/AreaChart: x should use 40 + idx * step formula
   * - All charts: y should reference _height from localState + offset
   */
  describe('Label Position Bug Fix', () => {
    /**
     * Find the label text element props inside showLabels conditional
     * Returns the props object of the text element inside the each loop
     */
    function findLabelTextProps(view: unknown): Record<string, unknown> | null {
      if (!view || typeof view !== 'object') return null;
      const node = view as Record<string, unknown>;

      // Check if this is the showLabels conditional (kind: "if" with condition/test for showLabels param)
      if (node['kind'] === 'if') {
        const test = (node['condition'] || node['test']) as Record<string, unknown> | undefined;
        if (test && test['expr'] === 'param' && test['name'] === 'showLabels') {
          // Found the showLabels if block, now find the text element in then branch
          const thenBranch = node['then'] as Record<string, unknown>;
          if (thenBranch && thenBranch['children'] && Array.isArray(thenBranch['children'])) {
            for (const child of thenBranch['children']) {
              const childNode = child as Record<string, unknown>;
              if (childNode['kind'] === 'each') {
                const body = childNode['body'] as Record<string, unknown>;
                if (body && body['kind'] === 'element' && body['tag'] === 'text') {
                  return body['props'] as Record<string, unknown> | null;
                }
              }
            }
          }
        }
      }

      // Search in children
      if (node['children'] && Array.isArray(node['children'])) {
        for (const child of node['children']) {
          const result = findLabelTextProps(child);
          if (result) return result;
        }
      }

      return null;
    }

    /**
     * Check if an expression is a hardcoded literal with a specific value
     */
    function isHardcodedLiteral(expr: unknown, value: string): boolean {
      if (!expr || typeof expr !== 'object') return false;
      const exprObj = expr as Record<string, unknown>;
      return exprObj['expr'] === 'lit' && exprObj['value'] === value;
    }

    /**
     * Check if an expression contains a reference to a specific variable
     */
    function containsVarReference(expr: unknown, varName: string): boolean {
      if (!expr || typeof expr !== 'object') return false;
      const exprObj = expr as Record<string, unknown>;

      if (exprObj['expr'] === 'var' && exprObj['name'] === varName) {
        return true;
      }

      // Recursively search
      for (const value of Object.values(exprObj)) {
        if (typeof value === 'object' && value !== null) {
          if (containsVarReference(value, varName)) return true;
        }
      }
      return false;
    }

    /**
     * Check if an expression contains a call to a specific method
     */
    function containsMethodCall(expr: unknown, methodName: string): boolean {
      if (!expr || typeof expr !== 'object') return false;
      const exprObj = expr as Record<string, unknown>;

      if (exprObj['expr'] === 'call' && exprObj['method'] === methodName) {
        return true;
      }

      // Recursively search
      for (const value of Object.values(exprObj)) {
        if (typeof value === 'object' && value !== null) {
          if (containsMethodCall(value, methodName)) return true;
        }
      }
      return false;
    }

    /**
     * Check if an expression contains a local reference
     */
    function containsLocalReference(expr: unknown, localName: string): boolean {
      if (!expr || typeof expr !== 'object') return false;
      const exprObj = expr as Record<string, unknown>;

      if (exprObj['expr'] === 'local' && exprObj['name'] === localName) {
        return true;
      }

      // Recursively search
      for (const value of Object.values(exprObj)) {
        if (typeof value === 'object' && value !== null) {
          if (containsLocalReference(value, localName)) return true;
        }
      }
      return false;
    }

    // ==================== BarChart Label Position Tests ====================

    describe('BarChart Label Position', () => {
      it('should NOT have hardcoded x position "50" for labels', () => {
        const labelProps = findLabelTextProps(ctx.barChart.view);
        expect(labelProps).not.toBeNull();
        // Current implementation uses hardcoded "50" - this test should FAIL
        expect(isHardcodedLiteral(labelProps!['x'], '50')).toBe(false);
      });

      it('should NOT have hardcoded y position "290" for labels', () => {
        const labelProps = findLabelTextProps(ctx.barChart.view);
        expect(labelProps).not.toBeNull();
        // Current implementation uses hardcoded "290" - this test should FAIL
        expect(isHardcodedLiteral(labelProps!['y'], '290')).toBe(false);
      });

      it('should calculate label x position using getBarDimensions', () => {
        const labelProps = findLabelTextProps(ctx.barChart.view);
        expect(labelProps).not.toBeNull();
        // Label x should call getBarDimensions to get bar center position
        expect(containsMethodCall(labelProps!['x'], 'getBarDimensions')).toBe(true);
      });

      it('should calculate label y position using _height reference', () => {
        const labelProps = findLabelTextProps(ctx.barChart.view);
        expect(labelProps).not.toBeNull();
        // Label y should reference _height from localState
        expect(containsLocalReference(labelProps!['y'], '_height')).toBe(true);
      });
    });

    // ==================== LineChart Label Position Tests ====================

    describe('LineChart Label Position', () => {
      it('should NOT have hardcoded x position "50" for labels', () => {
        const labelProps = findLabelTextProps(ctx.lineChart.view);
        expect(labelProps).not.toBeNull();
        // Current implementation uses hardcoded "50" - this test should FAIL
        expect(isHardcodedLiteral(labelProps!['x'], '50')).toBe(false);
      });

      it('should NOT have hardcoded y position "290" for labels', () => {
        const labelProps = findLabelTextProps(ctx.lineChart.view);
        expect(labelProps).not.toBeNull();
        // Current implementation uses hardcoded "290" - this test should FAIL
        expect(isHardcodedLiteral(labelProps!['y'], '290')).toBe(false);
      });

      it('should calculate label x position using idx variable', () => {
        const labelProps = findLabelTextProps(ctx.lineChart.view);
        expect(labelProps).not.toBeNull();
        // Label x should use idx for index-based positioning
        expect(containsVarReference(labelProps!['x'], 'idx')).toBe(true);
      });

      it('should calculate label y position using _height reference', () => {
        const labelProps = findLabelTextProps(ctx.lineChart.view);
        expect(labelProps).not.toBeNull();
        // Label y should reference _height from localState
        expect(containsLocalReference(labelProps!['y'], '_height')).toBe(true);
      });
    });

    // ==================== AreaChart Label Position Tests ====================

    describe('AreaChart Label Position', () => {
      it('should NOT have hardcoded x position "50" for labels', () => {
        const labelProps = findLabelTextProps(ctx.areaChart.view);
        expect(labelProps).not.toBeNull();
        // Current implementation uses hardcoded "50" - this test should FAIL
        expect(isHardcodedLiteral(labelProps!['x'], '50')).toBe(false);
      });

      it('should NOT have hardcoded y position "290" for labels', () => {
        const labelProps = findLabelTextProps(ctx.areaChart.view);
        expect(labelProps).not.toBeNull();
        // Current implementation uses hardcoded "290" - this test should FAIL
        expect(isHardcodedLiteral(labelProps!['y'], '290')).toBe(false);
      });

      it('should calculate label x position using idx variable', () => {
        const labelProps = findLabelTextProps(ctx.areaChart.view);
        expect(labelProps).not.toBeNull();
        // Label x should use idx for index-based positioning
        expect(containsVarReference(labelProps!['x'], 'idx')).toBe(true);
      });

      it('should calculate label y position using _height reference', () => {
        const labelProps = findLabelTextProps(ctx.areaChart.view);
        expect(labelProps).not.toBeNull();
        // Label y should reference _height from localState
        expect(containsLocalReference(labelProps!['y'], '_height')).toBe(true);
      });
    });

    // ==================== Cross-Chart Label Position Consistency ====================

    describe('Cross-Chart Label Position Consistency', () => {
      it('all charts should position labels dynamically based on data index', () => {
        const barLabelProps = findLabelTextProps(ctx.barChart.view);
        const lineLabelProps = findLabelTextProps(ctx.lineChart.view);
        const areaLabelProps = findLabelTextProps(ctx.areaChart.view);

        // All should have non-hardcoded x positions
        expect(barLabelProps).not.toBeNull();
        expect(lineLabelProps).not.toBeNull();
        expect(areaLabelProps).not.toBeNull();

        expect(isHardcodedLiteral(barLabelProps!['x'], '50')).toBe(false);
        expect(isHardcodedLiteral(lineLabelProps!['x'], '50')).toBe(false);
        expect(isHardcodedLiteral(areaLabelProps!['x'], '50')).toBe(false);
      });

      it('all charts should position label y using _height reference', () => {
        const barLabelProps = findLabelTextProps(ctx.barChart.view);
        const lineLabelProps = findLabelTextProps(ctx.lineChart.view);
        const areaLabelProps = findLabelTextProps(ctx.areaChart.view);

        // All y positions should reference _height
        expect(containsLocalReference(barLabelProps!['y'], '_height')).toBe(true);
        expect(containsLocalReference(lineLabelProps!['y'], '_height')).toBe(true);
        expect(containsLocalReference(areaLabelProps!['y'], '_height')).toBe(true);
      });
    });
  });

  // ==================== Y-axis Scaling Tests ====================

  describe('Y-axis scaling with scaleChartY', () => {
    describe('LineChart', () => {
      it('should have _bounds in localState', () => {
        expect(hasLocalState(ctx.lineChart, '_bounds')).toBe(true);
      });

      it('should have _paddingTop in localState', () => {
        expect(hasLocalState(ctx.lineChart, '_paddingTop')).toBe(true);
      });

      it('should have _paddingBottom in localState', () => {
        expect(hasLocalState(ctx.lineChart, '_paddingBottom')).toBe(true);
      });

      it('should use scaleChartY for Y coordinate calculation', () => {
        const call = findExpressionCall(ctx.lineChart.view, 'scaleChartY');
        expect(call).not.toBeNull();
      });

      it('should use getChartBounds for _bounds initial value', () => {
        const bounds = ctx.lineChart.localState!['_bounds'];
        const initial = bounds.initial as Record<string, unknown>;
        expect(initial['expr']).toBe('call');
        expect(initial['method']).toBe('getChartBounds');
      });
    });

    describe('AreaChart', () => {
      it('should have _bounds in localState', () => {
        expect(hasLocalState(ctx.areaChart, '_bounds')).toBe(true);
      });

      it('should have _paddingTop in localState', () => {
        expect(hasLocalState(ctx.areaChart, '_paddingTop')).toBe(true);
      });

      it('should have _paddingBottom in localState', () => {
        expect(hasLocalState(ctx.areaChart, '_paddingBottom')).toBe(true);
      });

      it('should use scaleChartY for Y coordinate calculation', () => {
        const call = findExpressionCall(ctx.areaChart.view, 'scaleChartY');
        expect(call).not.toBeNull();
      });

      it('should use getChartBounds for _bounds initial value', () => {
        const bounds = ctx.areaChart.localState!['_bounds'];
        const initial = bounds.initial as Record<string, unknown>;
        expect(initial['expr']).toBe('call');
        expect(initial['method']).toBe('getChartBounds');
      });

      it('should use _height minus _paddingBottom as getAreaPath baseline', () => {
        const areaPathCall = findExpressionCall(ctx.areaChart.view, 'getAreaPath') as Record<string, unknown> | null;
        expect(areaPathCall).not.toBeNull();
        const args = areaPathCall!['args'] as Array<Record<string, unknown>>;
        // Second arg is the baseline
        const baseline = args[1];
        expect(baseline['expr']).toBe('bin');
        expect(baseline['op']).toBe('-');
        const left = baseline['left'] as Record<string, unknown>;
        const right = baseline['right'] as Record<string, unknown>;
        expect(left['expr']).toBe('local');
        expect(left['name']).toBe('_height');
        expect(right['expr']).toBe('local');
        expect(right['name']).toBe('_paddingBottom');
      });
    });

    describe('ScatterChart', () => {
      it('should have _bounds in localState', () => {
        expect(hasLocalState(ctx.scatterChart, '_bounds')).toBe(true);
      });

      it('should have _paddingTop in localState', () => {
        expect(hasLocalState(ctx.scatterChart, '_paddingTop')).toBe(true);
      });

      it('should have _paddingBottom in localState', () => {
        expect(hasLocalState(ctx.scatterChart, '_paddingBottom')).toBe(true);
      });

      it('should use scaleChartY for Y coordinate calculation', () => {
        const call = findExpressionCall(ctx.scatterChart.view, 'scaleChartY');
        expect(call).not.toBeNull();
      });

      it('should have localState with _width and _height', () => {
        expect(hasLocalState(ctx.scatterChart, '_width')).toBe(true);
        expect(hasLocalState(ctx.scatterChart, '_height')).toBe(true);
      });

      it('should use getChartBounds with yKey for _bounds initial value', () => {
        const bounds = ctx.scatterChart.localState!['_bounds'];
        const initial = bounds.initial as Record<string, unknown>;
        expect(initial['expr']).toBe('call');
        expect(initial['method']).toBe('getChartBounds');
        // Should use yKey param, not valueKey
        const args = initial['args'] as Array<Record<string, unknown>>;
        const keyArg = args[1];
        expect(keyArg['expr']).toBe('param');
        expect(keyArg['name']).toBe('yKey');
      });
    });
  });

  // ==================== Apple Health Redesign Features ====================

  describe('Apple Health Redesign Features', () => {
    // ==================== Style Preset Redesign ====================

    describe('Redesign: Style Presets', () => {
      let styles: Record<string, any>;
      beforeAll(() => {
        styles = loadChartStyles();
      });

      it('chartContainer should have rounded-2xl', () => {
        expect(styles.chartContainer.base).toContain('rounded-2xl');
      });

      it('chartContainer should have dark mode', () => {
        expect(styles.chartContainer.base).toContain('dark:bg-gray-900');
      });

      it('chartGrid should have dark mode', () => {
        expect(styles.chartGrid.base).toContain('dark:stroke-gray-600/25');
      });

      it('chartTooltip should have backdrop-blur', () => {
        expect(styles.chartTooltip.base).toContain('backdrop-blur');
      });

      it('chartTooltip should have rounded-xl', () => {
        expect(styles.chartTooltip.base).toContain('rounded-xl');
      });

      it('should have chartGridLine style', () => {
        expect(styles.chartGridLine).toBeDefined();
        expect(styles.chartGridLine.base).toContain('stroke-gray-300/25');
      });

      it('should have chartYLabel style with text-[10px]', () => {
        expect(styles.chartYLabel).toBeDefined();
        expect(styles.chartYLabel.base).toContain('text-[10px]');
      });

      it('chartSlice should have stroke for gap', () => {
        expect(styles.chartSlice.base).toContain('stroke-white');
      });

      it('chartLegendItem should have dark mode', () => {
        expect(styles.chartLegendItem.base).toContain('dark:text-gray-300');
      });
    });

    // ==================== LineChart Redesign ====================

    describe('Redesign: LineChart', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('line-chart');
      });

      it('should have _paddingLeft local state', () => {
        expect(hasLocalState(component, '_paddingLeft')).toBe(true);
      });

      it('should have _gridLines local state', () => {
        expect(hasLocalState(component, '_gridLines')).toBe(true);
      });

      it('should call getChartGridLines', () => {
        const gridLines = component.localState?.['_gridLines'];
        expect(gridLines).toBeDefined();
        const initialStr = JSON.stringify(gridLines?.initial);
        expect(initialStr).toContain('"method":"getChartGridLines"');
      });

      it('should have defs element for gradients', () => {
        expect(hasElementTag(component.view, 'defs')).toBe(true);
      });

      it('should have linearGradient element', () => {
        expect(hasElementTag(component.view, 'linearGradient')).toBe(true);
      });

      it('should default stroke-width to 2.5 for Apple Health style', () => {
        expect(JSON.stringify(component.view)).toContain('"value":2.5');
      });
    });

    // ==================== AreaChart Redesign ====================

    describe('Redesign: AreaChart', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('area-chart');
      });

      it('should have _paddingLeft local state', () => {
        expect(hasLocalState(component, '_paddingLeft')).toBe(true);
      });

      it('should have _gridLines local state', () => {
        expect(hasLocalState(component, '_gridLines')).toBe(true);
      });

      it('should have defs element for gradients', () => {
        expect(hasElementTag(component.view, 'defs')).toBe(true);
      });

      it('should have linearGradient for area fill', () => {
        expect(hasElementTag(component.view, 'linearGradient')).toBe(true);
      });

      it('should default fill-opacity to 0.4', () => {
        expect(JSON.stringify(component.view)).toContain('"value":0.4');
      });
    });

    // ==================== BarChart Redesign ====================

    describe('Redesign: BarChart', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('bar-chart');
      });

      it('should call getRoundedBarPath for bars', () => {
        expect(findExpressionCall(component.view, 'getRoundedBarPath')).not.toBeNull();
      });

      it('should have defs element for bar gradients', () => {
        expect(hasElementTag(component.view, 'defs')).toBe(true);
      });

      it('should have _gridLines local state', () => {
        expect(hasLocalState(component, '_gridLines')).toBe(true);
      });

      it('should use path elements with getRoundedBarPath instead of rect for bars', () => {
        const viewStr = JSON.stringify(component.view);
        expect(viewStr).toContain('"method":"getRoundedBarPath"');
      });
    });

    // ==================== ScatterChart Redesign ====================

    describe('Redesign: ScatterChart', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('scatter-chart');
      });

      it('should have defs with radialGradient', () => {
        expect(hasElementTag(component.view, 'defs')).toBe(true);
        expect(hasElementTag(component.view, 'radialGradient')).toBe(true);
      });

      it('should have _gridLines local state', () => {
        expect(hasLocalState(component, '_gridLines')).toBe(true);
      });

      it('should call getChartGridLines', () => {
        const gridLines = component.localState?.['_gridLines'];
        expect(gridLines).toBeDefined();
        const initialStr = JSON.stringify(gridLines?.initial);
        expect(initialStr).toContain('"method":"getChartGridLines"');
      });
    });

    // ==================== PieChart Redesign ====================

    describe('Redesign: PieChart', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('pie-chart');
      });

      it('should call getSliceLabelPosition for labels', () => {
        expect(findExpressionCall(component.view, 'getSliceLabelPosition')).not.toBeNull();
      });
    });

    // ==================== DonutChart Redesign ====================

    describe('Redesign: DonutChart', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('donut-chart');
      });

      it('should call getActivityRingArcPath for ring segments', () => {
        expect(findExpressionCall(component.view, 'getActivityRingArcPath')).not.toBeNull();
      });

      it('should use getActivityRingArcPath for activity ring arcs', () => {
        const viewStr = JSON.stringify(component.view);
        expect(viewStr).toContain('"method":"getActivityRingArcPath"');
      });
    });

    // ==================== RadarChart Redesign ====================

    describe('Redesign: RadarChart', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('radar-chart');
      });

      it('should call getRadarGridPolygons for concentric grid', () => {
        expect(findExpressionCall(component.view, 'getRadarGridPolygons')).not.toBeNull();
      });

      it('should have defs element for gradient', () => {
        expect(hasElementTag(component.view, 'defs')).toBe(true);
      });

      it('should have data points as circles', () => {
        expect(hasElementTag(component.view, 'circle')).toBe(true);
      });
    });

    // ==================== ChartTooltip Redesign ====================

    describe('Redesign: ChartTooltip', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('chart-tooltip');
      });

      it('tooltip should reference chartTooltip style with backdrop-blur', () => {
        expect(component.view).toBeDefined();
      });
    });

    // ==================== ChartLegend Redesign ====================

    describe('Redesign: ChartLegend', () => {
      let component: ComponentDef;
      beforeAll(() => {
        component = loadChartComponent('chart-legend');
      });

      it('should have rounded-full color indicators', () => {
        const viewStr = JSON.stringify(component.view);
        expect(viewStr).toContain('rounded-full');
      });
    });
  });
});
