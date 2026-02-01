/**
 * Test suite for @constela/ui package exports
 *
 * Verifies that the package exports:
 * 1. `components` object with 46 PascalCase component names
 * 2. All components are valid ComponentDef (validated by validateComponent)
 * 3. `styles` object with style presets
 * 4. All styles are valid StylePreset (validated by validateStylePreset)
 *
 * TDD Red Phase: These tests FAIL because components.ts and styles.ts don't exist yet.
 */

import { describe, it, expect } from 'vitest';
import {
  validateComponent,
  validateStylePreset,
} from '../index.js';

// These imports will FAIL until components.ts and styles.ts are implemented
import { components } from '../components.js';
import { styles } from '../styles.js';

// ==================== Component List (46 total) ====================

const EXPECTED_COMPONENTS = [
  // Form (7)
  'Button',
  'Input',
  'Textarea',
  'Select',
  'Checkbox',
  'Radio',
  'Switch',
  // Feedback (5)
  'Alert',
  'Toast',
  'Badge',
  'Skeleton',
  'Avatar',
  // Layout (4)
  'Card',
  'Container',
  'Grid',
  'Stack',
  // Interactive (4)
  'Dialog',
  'Tooltip',
  'Popover',
  'Tabs',
  // Navigation (2)
  'Breadcrumb',
  'Pagination',
  // Accordion (4)
  'Accordion',
  'AccordionItem',
  'AccordionTrigger',
  'AccordionContent',
  // Tree (2)
  'Tree',
  'TreeNode',
  // Date (2)
  'Calendar',
  'Datepicker',
  // Virtual (1)
  'VirtualScroll',
  // DataTable (5)
  'DataTable',
  'DataTableCell',
  'DataTableHeader',
  'DataTablePagination',
  'DataTableRow',
  // Chart (10)
  'AreaChart',
  'BarChart',
  'ChartAxis',
  'ChartLegend',
  'ChartTooltip',
  'DonutChart',
  'LineChart',
  'PieChart',
  'RadarChart',
  'ScatterChart',
] as const;

// ==================== Components Export Tests ====================

describe('components export', () => {
  describe('Object Structure', () => {
    it('should export a components object', () => {
      expect(components).toBeDefined();
      expect(typeof components).toBe('object');
      expect(components).not.toBeNull();
    });

    it('should export exactly 46 components', () => {
      const componentKeys = Object.keys(components);
      expect(componentKeys).toHaveLength(46);
    });

    it('should export all expected component names', () => {
      const componentKeys = Object.keys(components);
      for (const name of EXPECTED_COMPONENTS) {
        expect(componentKeys).toContain(name);
      }
    });
  });

  describe('Component Name Conventions', () => {
    it('should have all component names in PascalCase', () => {
      const componentKeys = Object.keys(components);
      const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;

      for (const name of componentKeys) {
        expect(name).toMatch(pascalCaseRegex);
      }
    });
  });

  describe('Component Validation', () => {
    it.each(EXPECTED_COMPONENTS)(
      'should export valid ComponentDef for %s',
      (componentName) => {
        const component = components[componentName];
        expect(component).toBeDefined();

        const result = validateComponent(component);
        expect(result.valid).toBe(true);
        if (!result.valid) {
          throw new Error(
            `Component "${componentName}" is invalid: ${result.errors.join(', ')}`
          );
        }
      }
    );
  });

  describe('Component Structure', () => {
    it.each(EXPECTED_COMPONENTS)(
      '%s should have a view property',
      (componentName) => {
        const component = components[componentName];
        expect(component).toHaveProperty('view');
      }
    );
  });
});

// ==================== Styles Export Tests ====================

describe('styles export', () => {
  describe('Object Structure', () => {
    it('should export a styles object', () => {
      expect(styles).toBeDefined();
      expect(typeof styles).toBe('object');
      expect(styles).not.toBeNull();
    });

    it('should export at least one style preset', () => {
      const styleKeys = Object.keys(styles);
      expect(styleKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Style Preset Validation', () => {
    it('should have all style presets valid', () => {
      const styleKeys = Object.keys(styles);

      for (const styleName of styleKeys) {
        const preset = styles[styleName];
        expect(preset).toBeDefined();

        const result = validateStylePreset(preset);
        expect(result.valid).toBe(true);
        if (!result.valid) {
          throw new Error(
            `Style preset "${styleName}" is invalid: ${result.errors.join(', ')}`
          );
        }
      }
    });
  });

  describe('Style Preset Structure', () => {
    it('should have all style presets with base property', () => {
      const styleKeys = Object.keys(styles);

      for (const styleName of styleKeys) {
        const preset = styles[styleName];
        expect(preset).toHaveProperty('base');
        expect(typeof preset.base).toBe('string');
      }
    });
  });
});

// ==================== Integration Tests ====================

describe('Package Exports Integration', () => {
  it('should export components and styles that work together', () => {
    // Verify both exports are available
    expect(components).toBeDefined();
    expect(styles).toBeDefined();
  });

  it('should have corresponding styles for components that need them', () => {
    // Common components that should have associated styles
    const componentsWithStyles = [
      'Button',
      'Input',
      'Card',
      'Alert',
      'Badge',
    ];

    const styleKeys = Object.keys(styles);

    for (const componentName of componentsWithStyles) {
      // Check if there's a style preset for this component
      // Style names typically follow pattern: componentNameStyles or componentName
      const lowerName = componentName.toLowerCase();
      const camelName = componentName.charAt(0).toLowerCase() + componentName.slice(1);
      const possibleStyleNames = [
        lowerName + 'Styles',
        camelName + 'Styles',
        lowerName,
      ];

      const hasStyle = possibleStyleNames.some((name) => styleKeys.includes(name));
      expect(hasStyle).toBe(true);
    }
  });
});
