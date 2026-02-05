/**
 * Test suite for DataTable Component Suite
 *
 * @constela/ui DataTable component tests following TDD methodology.
 * These tests verify the DataTable, DataTableHeader, DataTableRow, DataTableCell,
 * and DataTablePagination components structure, params, styles, and accessibility.
 *
 * Coverage:
 * - Component structure validation
 * - Params definition validation (including required params)
 * - Local state validation
 * - Style preset validation
 * - Accessibility attributes (role="table", aria-rowcount, aria-sort, aria-selected, etc.)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
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
  hasSlot,
  findPropInView,
  hasRole,
  hasAriaAttribute,
} from '../../tests/helpers/test-utils.js';

// ==================== Test Utilities ====================

/**
 * Find a child element by tag in the view tree
 */
function findChildByTag(view: any, tag: string): any {
  if (!view || !view.children) return null;
  for (const child of view.children) {
    if (child.kind === 'element' && child.tag === tag) {
      return child;
    }
    // Recursively search
    const found = findChildByTag(child, tag);
    if (found) return found;
  }
  return null;
}

/**
 * Check if view contains an each node iterating over a specific param
 */
function hasEachNode(view: any, paramName: string): boolean {
  if (!view) return false;
  if (view.kind === 'each') {
    if (view.items?.expr === 'param' && view.items?.name === paramName) {
      return true;
    }
  }
  if (view.children) {
    return view.children.some((child: any) => hasEachNode(child, paramName));
  }
  if (view.body) {
    return hasEachNode(view.body, paramName);
  }
  if (view.then) {
    return hasEachNode(view.then, paramName);
  }
  return false;
}

/**
 * Check if view contains an IndexExpr node
 */
function hasIndexExpr(view: any): boolean {
  if (!view) return false;
  if (typeof view === 'object') {
    if (view.expr === 'index') {
      return true;
    }
    for (const key of Object.keys(view)) {
      if (hasIndexExpr(view[key])) {
        return true;
      }
    }
  }
  if (Array.isArray(view)) {
    return view.some(hasIndexExpr);
  }
  return false;
}

/**
 * Get the path to a component file in the data-table directory
 */
function getDataTableComponentPath(fileName: string): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, fileName);
}

/**
 * Load a specific data-table sub-component
 */
function loadDataTableComponent(componentName: string): ComponentDef {
  const path = getDataTableComponentPath(`${componentName}.constela.json`);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content) as ComponentDef;
}

/**
 * Load data-table styles
 */
function loadDataTableStyles(): Record<string, StylePreset> {
  const path = getDataTableComponentPath('data-table.styles.json');
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
 * Check if a local state field has a specific initial value
 */
function hasLocalStateInitial(
  component: ComponentDef,
  fieldName: string,
  expectedInitial: unknown
): boolean {
  if (!component.localState || !(fieldName in component.localState)) {
    return false;
  }
  const actualInitial = component.localState[fieldName].initial;
  if (Array.isArray(expectedInitial) && Array.isArray(actualInitial)) {
    return JSON.stringify(expectedInitial) === JSON.stringify(actualInitial);
  }
  return actualInitial === expectedInitial;
}

// ==================== Test Contexts ====================

interface DataTableTestContext {
  dataTable: ComponentDef;
  dataTableHeader: ComponentDef;
  dataTableRow: ComponentDef;
  dataTableCell: ComponentDef;
  dataTablePagination: ComponentDef;
  styles: Record<string, StylePreset>;
}

describe('DataTable Component Suite', () => {
  let ctx: DataTableTestContext;

  beforeAll(() => {
    ctx = {
      dataTable: loadDataTableComponent('data-table'),
      dataTableHeader: loadDataTableComponent('data-table-header'),
      dataTableRow: loadDataTableComponent('data-table-row'),
      dataTableCell: loadDataTableComponent('data-table-cell'),
      dataTablePagination: loadDataTableComponent('data-table-pagination'),
      styles: loadDataTableStyles(),
    };
  });

  // ==================== DataTable (Container) Tests ====================

  describe('DataTable (Container)', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.dataTable);
      });

      it('should have table as root element', () => {
        const rootTag = getRootTag(ctx.dataTable);
        expect(rootTag).toBe('table');
      });

      it('should have role="table" attribute', () => {
        expect(hasRole(ctx.dataTable.view, 'table')).toBe(true);
      });

      it('should have className using StyleExpr with dataTableContainer preset', () => {
        const className = findPropInView(ctx.dataTable.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'dataTableContainer',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = [
        'columns',
        'data',
        'pageSize',
        'sortable',
        'filterable',
        'selectable',
        'multiSelect',
        'stickyHeader',
      ];

      it('should have all expected params', () => {
        expect(hasParams(ctx.dataTable, expectedParams)).toBe(true);
      });

      describe('param: columns', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTable, 'columns')).toBe(true);
        });

        it('should have type json', () => {
          expect(hasParamType(ctx.dataTable, 'columns', 'json')).toBe(true);
        });
      });

      describe('param: data', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTable, 'data')).toBe(true);
        });

        it('should have type json', () => {
          expect(hasParamType(ctx.dataTable, 'data', 'json')).toBe(true);
        });
      });

      describe('param: pageSize', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTable, 'pageSize')).toBe(true);
        });

        it('should have type number', () => {
          expect(hasParamType(ctx.dataTable, 'pageSize', 'number')).toBe(true);
        });
      });

      describe('param: sortable', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTable, 'sortable')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTable, 'sortable', 'boolean')).toBe(true);
        });
      });

      describe('param: filterable', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTable, 'filterable')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTable, 'filterable', 'boolean')).toBe(true);
        });
      });

      describe('param: selectable', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTable, 'selectable')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTable, 'selectable', 'boolean')).toBe(true);
        });
      });

      describe('param: multiSelect', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTable, 'multiSelect')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTable, 'multiSelect', 'boolean')).toBe(true);
        });
      });

      describe('param: stickyHeader', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTable, 'stickyHeader')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTable, 'stickyHeader', 'boolean')).toBe(true);
        });
      });
    });

    // ==================== Local State Tests ====================

    describe('Local State', () => {
      it('should have currentPage local state', () => {
        expect(hasLocalState(ctx.dataTable, 'currentPage')).toBe(true);
      });

      it('should have currentPage as number type with initial value 0', () => {
        expect(hasLocalStateType(ctx.dataTable, 'currentPage', 'number')).toBe(true);
        expect(hasLocalStateInitial(ctx.dataTable, 'currentPage', 0)).toBe(true);
      });

      it('should have sortColumn local state', () => {
        expect(hasLocalState(ctx.dataTable, 'sortColumn')).toBe(true);
      });

      it('should have sortColumn as string type with initial value ""', () => {
        expect(hasLocalStateType(ctx.dataTable, 'sortColumn', 'string')).toBe(true);
        expect(hasLocalStateInitial(ctx.dataTable, 'sortColumn', '')).toBe(true);
      });

      it('should have sortDirection local state', () => {
        expect(hasLocalState(ctx.dataTable, 'sortDirection')).toBe(true);
      });

      it('should have sortDirection as string type with initial value "asc"', () => {
        expect(hasLocalStateType(ctx.dataTable, 'sortDirection', 'string')).toBe(true);
        expect(hasLocalStateInitial(ctx.dataTable, 'sortDirection', 'asc')).toBe(true);
      });

      it('should have filterText local state', () => {
        expect(hasLocalState(ctx.dataTable, 'filterText')).toBe(true);
      });

      it('should have filterText as string type with initial value ""', () => {
        expect(hasLocalStateType(ctx.dataTable, 'filterText', 'string')).toBe(true);
        expect(hasLocalStateInitial(ctx.dataTable, 'filterText', '')).toBe(true);
      });

      it('should have selectedRows local state', () => {
        expect(hasLocalState(ctx.dataTable, 'selectedRows')).toBe(true);
      });

      it('should have selectedRows as list type with initial value []', () => {
        expect(hasLocalStateType(ctx.dataTable, 'selectedRows', 'list')).toBe(true);
        expect(hasLocalStateInitial(ctx.dataTable, 'selectedRows', [])).toBe(true);
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="table" for screen readers', () => {
        const role = findPropInView(ctx.dataTable.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'table',
        });
      });

      it('should have aria-rowcount attribute', () => {
        expect(hasAriaAttribute(ctx.dataTable.view, 'aria-rowcount')).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (dataTableContainer)', () => {
      it('should have valid style preset structure', () => {
        const dataTableContainer = ctx.styles['dataTableContainer'];
        expect(dataTableContainer).toBeDefined();
        assertValidStylePreset(dataTableContainer);
      });

      it('should have base classes for table layout', () => {
        const dataTableContainer = ctx.styles['dataTableContainer'];
        expect(dataTableContainer.base).toBeDefined();
        expect(typeof dataTableContainer.base).toBe('string');
        expect(dataTableContainer.base).toContain('w-full');
      });
    });

    describe('Style Preset (dataTableToolbar)', () => {
      it('should have valid style preset structure', () => {
        const dataTableToolbar = ctx.styles['dataTableToolbar'];
        expect(dataTableToolbar).toBeDefined();
        assertValidStylePreset(dataTableToolbar);
      });

      it('should have filterable variant', () => {
        const dataTableToolbar = ctx.styles['dataTableToolbar'];
        expect(hasVariants(dataTableToolbar, ['filterable'])).toBe(true);
      });
    });

    describe('Style Preset (dataTableWrapper)', () => {
      it('should have valid style preset structure', () => {
        const dataTableWrapper = ctx.styles['dataTableWrapper'];
        expect(dataTableWrapper).toBeDefined();
        assertValidStylePreset(dataTableWrapper);
      });
    });

    // ==================== View Auto-generation Tests ====================

    describe('View Auto-generation', () => {
      it('should have thead element with column headers', () => {
        // Verify view has a thead element
        const thead = findChildByTag(ctx.dataTable.view, 'thead');
        expect(thead).not.toBeNull();
        // Check that thead contains tr with th elements generated from columns param
        expect(thead.children).toBeDefined();
        expect(thead.children.length).toBeGreaterThan(0);
      });

      it('should have tbody element with data rows', () => {
        // Verify view has a tbody element
        const tbody = findChildByTag(ctx.dataTable.view, 'tbody');
        expect(tbody).not.toBeNull();
        // Check that tbody uses each node to iterate over data param
        expect(hasEachNode(tbody, 'data')).toBe(true);
      });

      it('should iterate over columns param in thead', () => {
        // The thead should have an each node iterating over columns
        const thead = findChildByTag(ctx.dataTable.view, 'thead');
        expect(thead).not.toBeNull();
        expect(hasEachNode(thead, 'columns')).toBe(true);
      });

      it('should use IndexExpr for dynamic column access in cells', () => {
        // Verify that cells use { "expr": "index", "base": ..., "key": ... } pattern
        // to dynamically access row[col.key]
        const tbody = findChildByTag(ctx.dataTable.view, 'tbody');
        expect(tbody).not.toBeNull();
        expect(hasIndexExpr(tbody)).toBe(true);
      });

      it('should not have slot as direct child of table', () => {
        // The view should generate content, not just have a slot
        const hasSlotAsChild = ctx.dataTable.view.children?.some(
          (child: any) => child.kind === 'slot'
        );
        expect(hasSlotAsChild).toBe(false);
      });
    });

    // ==================== Local Actions Tests ====================

    describe('Local Actions', () => {
      it('should have handleSort local action', () => {
        expect(ctx.dataTable.localActions).toBeDefined();
        const handleSort = ctx.dataTable.localActions?.find((a: any) => a.name === 'handleSort');
        expect(handleSort).toBeDefined();
      });

      it('should have handleFilter local action', () => {
        const handleFilter = ctx.dataTable.localActions?.find(
          (a: any) => a.name === 'handleFilter'
        );
        expect(handleFilter).toBeDefined();
      });

      it('should have handlePageChange local action', () => {
        const handlePageChange = ctx.dataTable.localActions?.find(
          (a: any) => a.name === 'handlePageChange'
        );
        expect(handlePageChange).toBeDefined();
      });

      it('should have handleSelectionChange local action', () => {
        const handleSelectionChange = ctx.dataTable.localActions?.find(
          (a: any) => a.name === 'handleSelectionChange'
        );
        expect(handleSelectionChange).toBeDefined();
      });

      it('should have toggleRowSelection local action', () => {
        const toggleRowSelection = ctx.dataTable.localActions?.find(
          (a: any) => a.name === 'toggleRowSelection'
        );
        expect(toggleRowSelection).toBeDefined();
      });
    });
  });

  // ==================== DataTableHeader Tests ====================

  describe('DataTableHeader', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.dataTableHeader);
      });

      it('should have th as root element', () => {
        const rootTag = getRootTag(ctx.dataTableHeader);
        expect(rootTag).toBe('th');
      });

      it('should have role="columnheader" attribute', () => {
        expect(hasRole(ctx.dataTableHeader.view, 'columnheader')).toBe(true);
      });

      it('should have className using StyleExpr with dataTableHeaderCell preset', () => {
        const className = findPropInView(ctx.dataTableHeader.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'dataTableHeaderCell',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['column', 'sortable', 'sorted', 'sortDirection'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.dataTableHeader, expectedParams)).toBe(true);
      });

      describe('param: column', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTableHeader, 'column')).toBe(true);
        });

        it('should have type json', () => {
          expect(hasParamType(ctx.dataTableHeader, 'column', 'json')).toBe(true);
        });
      });

      describe('param: sortable', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTableHeader, 'sortable')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTableHeader, 'sortable', 'boolean')).toBe(true);
        });
      });

      describe('param: sorted', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTableHeader, 'sorted')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTableHeader, 'sorted', 'boolean')).toBe(true);
        });
      });

      describe('param: sortDirection', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTableHeader, 'sortDirection')).toBe(true);
        });

        it('should have type string', () => {
          expect(hasParamType(ctx.dataTableHeader, 'sortDirection', 'string')).toBe(true);
        });
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="columnheader" for screen readers', () => {
        const role = findPropInView(ctx.dataTableHeader.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'columnheader',
        });
      });

      it('should have aria-sort attribute', () => {
        expect(hasAriaAttribute(ctx.dataTableHeader.view, 'aria-sort')).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (dataTableHeader)', () => {
      it('should have valid style preset structure', () => {
        const dataTableHeader = ctx.styles['dataTableHeader'];
        expect(dataTableHeader).toBeDefined();
        assertValidStylePreset(dataTableHeader);
      });

      it('should have sticky variant', () => {
        const dataTableHeader = ctx.styles['dataTableHeader'];
        expect(hasVariants(dataTableHeader, ['sticky'])).toBe(true);
      });

      describe('variant options', () => {
        it('should have true sticky option with position sticky', () => {
          const dataTableHeader = ctx.styles['dataTableHeader'];
          expect(hasVariantOptions(dataTableHeader, 'sticky', ['true'])).toBe(true);
          expect(dataTableHeader.variants?.sticky?.['true']).toContain('sticky');
        });
      });
    });

    describe('Style Preset (dataTableHeaderRow)', () => {
      it('should have valid style preset structure', () => {
        const dataTableHeaderRow = ctx.styles['dataTableHeaderRow'];
        expect(dataTableHeaderRow).toBeDefined();
        assertValidStylePreset(dataTableHeaderRow);
      });
    });

    describe('Style Preset (dataTableHeaderCell)', () => {
      it('should have valid style preset structure', () => {
        const dataTableHeaderCell = ctx.styles['dataTableHeaderCell'];
        expect(dataTableHeaderCell).toBeDefined();
        assertValidStylePreset(dataTableHeaderCell);
      });

      it('should have sortable variant', () => {
        const dataTableHeaderCell = ctx.styles['dataTableHeaderCell'];
        expect(hasVariants(dataTableHeaderCell, ['sortable'])).toBe(true);
      });

      it('should have align variant with left, center, right options', () => {
        const dataTableHeaderCell = ctx.styles['dataTableHeaderCell'];
        expect(hasVariants(dataTableHeaderCell, ['align'])).toBe(true);
        expect(hasVariantOptions(dataTableHeaderCell, 'align', ['left', 'center', 'right'])).toBe(true);
      });
    });
  });

  // ==================== DataTableRow Tests ====================

  describe('DataTableRow', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.dataTableRow);
      });

      it('should have tr as root element', () => {
        const rootTag = getRootTag(ctx.dataTableRow);
        expect(rootTag).toBe('tr');
      });

      it('should have role="row" attribute', () => {
        expect(hasRole(ctx.dataTableRow.view, 'row')).toBe(true);
      });

      it('should have className using StyleExpr with dataTableRow preset', () => {
        const className = findPropInView(ctx.dataTableRow.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'dataTableRow',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['row', 'rowIndex', 'selected', 'selectable'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.dataTableRow, expectedParams)).toBe(true);
      });

      describe('param: row', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTableRow, 'row')).toBe(true);
        });

        it('should have type json', () => {
          expect(hasParamType(ctx.dataTableRow, 'row', 'json')).toBe(true);
        });
      });

      describe('param: rowIndex', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTableRow, 'rowIndex')).toBe(true);
        });

        it('should have type number', () => {
          expect(hasParamType(ctx.dataTableRow, 'rowIndex', 'number')).toBe(true);
        });
      });

      describe('param: selected', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTableRow, 'selected')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTableRow, 'selected', 'boolean')).toBe(true);
        });
      });

      describe('param: selectable', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTableRow, 'selectable')).toBe(true);
        });

        it('should have type boolean', () => {
          expect(hasParamType(ctx.dataTableRow, 'selectable', 'boolean')).toBe(true);
        });
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="row" for screen readers', () => {
        const role = findPropInView(ctx.dataTableRow.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'row',
        });
      });

      it('should have aria-rowindex attribute', () => {
        expect(hasAriaAttribute(ctx.dataTableRow.view, 'aria-rowindex')).toBe(true);
      });

      it('should have aria-selected attribute', () => {
        expect(hasAriaAttribute(ctx.dataTableRow.view, 'aria-selected')).toBe(true);
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (dataTableBody)', () => {
      it('should have valid style preset structure', () => {
        const dataTableBody = ctx.styles['dataTableBody'];
        expect(dataTableBody).toBeDefined();
        assertValidStylePreset(dataTableBody);
      });
    });

    describe('Style Preset (dataTableRow)', () => {
      it('should have valid style preset structure', () => {
        const dataTableRow = ctx.styles['dataTableRow'];
        expect(dataTableRow).toBeDefined();
        assertValidStylePreset(dataTableRow);
      });

      it('should have selected variant', () => {
        const dataTableRow = ctx.styles['dataTableRow'];
        expect(hasVariants(dataTableRow, ['selected'])).toBe(true);
      });

      describe('variant options', () => {
        it('should have true selected option with highlight styling', () => {
          const dataTableRow = ctx.styles['dataTableRow'];
          expect(hasVariantOptions(dataTableRow, 'selected', ['true', 'false'])).toBe(true);
        });
      });
    });
  });

  // ==================== DataTableCell Tests ====================

  describe('DataTableCell', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.dataTableCell);
      });

      it('should have td as root element', () => {
        const rootTag = getRootTag(ctx.dataTableCell);
        expect(rootTag).toBe('td');
      });

      it('should have role="cell" attribute', () => {
        expect(hasRole(ctx.dataTableCell.view, 'cell')).toBe(true);
      });

      it('should have className using StyleExpr with dataTableCell preset', () => {
        const className = findPropInView(ctx.dataTableCell.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'dataTableCell',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['value', 'column', 'align'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.dataTableCell, expectedParams)).toBe(true);
      });

      describe('param: value', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTableCell, 'value')).toBe(true);
        });

        it('should have type json', () => {
          expect(hasParamType(ctx.dataTableCell, 'value', 'json')).toBe(true);
        });
      });

      describe('param: column', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTableCell, 'column')).toBe(true);
        });

        it('should have type json', () => {
          expect(hasParamType(ctx.dataTableCell, 'column', 'json')).toBe(true);
        });
      });

      describe('param: align', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTableCell, 'align')).toBe(true);
        });

        it('should have type string', () => {
          expect(hasParamType(ctx.dataTableCell, 'align', 'string')).toBe(true);
        });
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have role="cell" for screen readers', () => {
        const role = findPropInView(ctx.dataTableCell.view, 'role');
        expect(role).not.toBeNull();
        expect(role).toMatchObject({
          expr: 'lit',
          value: 'cell',
        });
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (dataTableCell)', () => {
      it('should have valid style preset structure', () => {
        const dataTableCell = ctx.styles['dataTableCell'];
        expect(dataTableCell).toBeDefined();
        assertValidStylePreset(dataTableCell);
      });

      it('should have align variant with left, center, right options', () => {
        const dataTableCell = ctx.styles['dataTableCell'];
        expect(hasVariants(dataTableCell, ['align'])).toBe(true);
        expect(hasVariantOptions(dataTableCell, 'align', ['left', 'center', 'right'])).toBe(true);
      });

      describe('variant options', () => {
        it('should have left align option with text-left', () => {
          const dataTableCell = ctx.styles['dataTableCell'];
          expect(dataTableCell.variants?.align?.['left']).toContain('text-left');
        });

        it('should have center align option with text-center', () => {
          const dataTableCell = ctx.styles['dataTableCell'];
          expect(dataTableCell.variants?.align?.['center']).toContain('text-center');
        });

        it('should have right align option with text-right', () => {
          const dataTableCell = ctx.styles['dataTableCell'];
          expect(dataTableCell.variants?.align?.['right']).toContain('text-right');
        });
      });

      describe('default variants', () => {
        it('should have default align set to left', () => {
          const dataTableCell = ctx.styles['dataTableCell'];
          expect(hasDefaultVariants(dataTableCell, { align: 'left' })).toBe(true);
        });
      });
    });
  });

  // ==================== DataTablePagination Tests ====================

  describe('DataTablePagination', () => {
    // ==================== Component Structure Tests ====================

    describe('Component Structure', () => {
      it('should have valid component structure', () => {
        assertValidComponent(ctx.dataTablePagination);
      });

      it('should have nav as root element', () => {
        const rootTag = getRootTag(ctx.dataTablePagination);
        expect(rootTag).toBe('nav');
      });

      it('should have className using StyleExpr with dataTablePagination preset', () => {
        const className = findPropInView(ctx.dataTablePagination.view, 'className');
        expect(className).not.toBeNull();
        expect(className).toMatchObject({
          expr: 'style',
          name: 'dataTablePagination',
        });
      });
    });

    // ==================== Params Validation Tests ====================

    describe('Params Validation', () => {
      const expectedParams = ['currentPage', 'totalPages', 'maxVisible'];

      it('should have all expected params', () => {
        expect(hasParams(ctx.dataTablePagination, expectedParams)).toBe(true);
      });

      describe('param: currentPage', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTablePagination, 'currentPage')).toBe(true);
        });

        it('should have type number', () => {
          expect(hasParamType(ctx.dataTablePagination, 'currentPage', 'number')).toBe(true);
        });
      });

      describe('param: totalPages', () => {
        it('should be required', () => {
          expect(isRequiredParam(ctx.dataTablePagination, 'totalPages')).toBe(true);
        });

        it('should have type number', () => {
          expect(hasParamType(ctx.dataTablePagination, 'totalPages', 'number')).toBe(true);
        });
      });

      describe('param: maxVisible', () => {
        it('should be optional', () => {
          expect(isOptionalParam(ctx.dataTablePagination, 'maxVisible')).toBe(true);
        });

        it('should have type number', () => {
          expect(hasParamType(ctx.dataTablePagination, 'maxVisible', 'number')).toBe(true);
        });
      });
    });

    // ==================== Accessibility Tests ====================

    describe('Accessibility', () => {
      it('should have aria-label="Pagination" attribute', () => {
        const ariaLabel = findPropInView(ctx.dataTablePagination.view, 'aria-label');
        expect(ariaLabel).not.toBeNull();
        expect(ariaLabel).toMatchObject({
          expr: 'lit',
          value: 'Pagination',
        });
      });
    });

    // ==================== Style Preset Tests ====================

    describe('Style Preset (dataTablePagination)', () => {
      it('should have valid style preset structure', () => {
        const dataTablePagination = ctx.styles['dataTablePagination'];
        expect(dataTablePagination).toBeDefined();
        assertValidStylePreset(dataTablePagination);
      });

      it('should have base classes for flex layout', () => {
        const dataTablePagination = ctx.styles['dataTablePagination'];
        expect(dataTablePagination.base).toBeDefined();
        expect(typeof dataTablePagination.base).toBe('string');
        expect(dataTablePagination.base).toContain('flex');
      });
    });
  });
});
