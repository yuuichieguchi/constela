/**
 * Test module for Component Props analysis.
 *
 * Coverage:
 * - EventHandler props should not cause analysis errors
 * - EventHandler is properly recognized and not treated as an expression
 * - EventHandler action references should be validated (like in element props)
 * - Component nodes with mixed expression and EventHandler props work correctly
 *
 * TDD Red Phase: These tests verify that validateComponentProps properly handles
 * EventHandler props by:
 * 1. Skipping them from expression validation
 * 2. Validating the action references within EventHandler props
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program, ComponentDef } from '@constela/core';

describe('analyzePass with Component EventHandler Props', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program with a component definition and usage
   */
  function createProgramWithComponentUsage(
    componentDef: ComponentDef,
    componentUsageProps: Record<string, unknown>,
    componentName: string = 'TestComponent',
    actions: Array<{ name: string; steps: unknown[] }> = [
      { name: 'handleSort', steps: [] },
      { name: 'handleClick', steps: [] },
      { name: 'handleSelect', steps: [] },
    ]
  ): Program {
    return {
      version: '1.0',
      state: {},
      actions,
      view: {
        kind: 'component',
        name: componentName,
        props: componentUsageProps,
      },
      components: {
        [componentName]: componentDef,
      },
    } as unknown as Program;
  }

  // ==================== EventHandler Props ====================

  describe('EventHandler props in component usage', () => {
    it('should accept component with EventHandler prop referencing valid action', () => {
      // Arrange
      // Component definition with an optional callback param
      const componentDef: ComponentDef = {
        params: {
          onSort: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'table' },
      } as unknown as ComponentDef;

      // Component usage with EventHandler prop
      const props = {
        onSort: { event: 'click', action: 'handleSort' },
      };

      const program = createProgramWithComponentUsage(componentDef, props);

      // Act
      const result = analyzePass(program);

      // Assert
      // The EventHandler should be recognized and NOT cause an error
      expect(result.ok).toBe(true);
    });

    it('should accept component with multiple EventHandler props', () => {
      // Arrange
      const componentDef: ComponentDef = {
        params: {
          onClick: { type: 'any', required: false },
          onSelect: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'div' },
      } as unknown as ComponentDef;

      const props = {
        onClick: { event: 'click', action: 'handleClick' },
        onSelect: { event: 'change', action: 'handleSelect' },
      };

      const program = createProgramWithComponentUsage(componentDef, props);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept component with mixed expression and EventHandler props', () => {
      // Arrange
      // DataTable component with data prop (expression) and onSort prop (EventHandler)
      const componentDef: ComponentDef = {
        params: {
          data: { type: 'list', required: true },
          onSort: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'table' },
      } as unknown as ComponentDef;

      const program: Program = {
        version: '1.0',
        state: {
          items: { type: 'list', initial: [] },
        },
        actions: [{ name: 'sortData', steps: [] }],
        view: {
          kind: 'component',
          name: 'DataTable',
          props: {
            data: { expr: 'state', name: 'items' },
            onSort: { event: 'click', action: 'sortData' },
          },
        },
        components: {
          DataTable: componentDef,
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Both the expression prop and EventHandler prop should be valid
      expect(result.ok).toBe(true);
    });

    it('should NOT treat EventHandler as an expression to validate', () => {
      // Arrange
      // This test verifies that the EventHandler is not passed to validateExpression
      // If it were, it would fail because { event: ..., action: ... } is not a valid expression
      const componentDef: ComponentDef = {
        params: {
          onAction: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'button' },
      } as unknown as ComponentDef;

      const props = {
        onAction: { event: 'click', action: 'handleClick' },
      };

      const program = createProgramWithComponentUsage(componentDef, props);

      // Act
      const result = analyzePass(program);

      // Assert
      // If this fails, it means the EventHandler was incorrectly treated as an expression
      expect(result.ok).toBe(true);
      if (!result.ok) {
        // Should not reach here, but if it does, there should be no expression-related errors
        const hasExpressionError = result.errors.some(
          (e) => e.code === 'SCHEMA_ERROR' || e.message.includes('expression')
        );
        expect(hasExpressionError).toBe(false);
      }
    });
  });

  // ==================== EventHandler Action Validation ====================

  describe('EventHandler action reference validation in component props', () => {
    it('should reject EventHandler prop referencing undefined action', () => {
      // Arrange
      // This test verifies that EventHandler action references are validated
      // just like they are in element props (see analyze.ts line 1175-1186)
      const componentDef: ComponentDef = {
        params: {
          onSort: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'table' },
      } as unknown as ComponentDef;

      const props = {
        onSort: { event: 'click', action: 'nonExistentAction' }, // This action does not exist
      };

      // No actions defined that match 'nonExistentAction'
      const program = createProgramWithComponentUsage(componentDef, props, 'TestComponent', []);

      // Act
      const result = analyzePass(program);

      // Assert
      // Should fail because 'nonExistentAction' is not defined
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
        expect(result.errors[0]?.message).toContain('nonExistentAction');
      }
    });

    it('should reject component with multiple EventHandler props referencing undefined actions', () => {
      // Arrange
      const componentDef: ComponentDef = {
        params: {
          onClick: { type: 'any', required: false },
          onSelect: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'div' },
      } as unknown as ComponentDef;

      const props = {
        onClick: { event: 'click', action: 'undefinedAction1' },
        onSelect: { event: 'change', action: 'undefinedAction2' },
      };

      const program = createProgramWithComponentUsage(componentDef, props, 'TestComponent', []);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should have UNDEFINED_ACTION errors for both handlers
        const undefinedActionErrors = result.errors.filter((e) => e.code === 'UNDEFINED_ACTION');
        expect(undefinedActionErrors.length).toBe(2);
      }
    });

    it('should validate EventHandler payload expressions in component props', () => {
      // Arrange
      // EventHandler can have a payload that should also be validated
      const componentDef: ComponentDef = {
        params: {
          onSelect: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'select' },
      } as unknown as ComponentDef;

      const props = {
        onSelect: {
          event: 'change',
          action: 'handleSelect',
          payload: { expr: 'state', name: 'undefinedState' }, // Invalid state reference in payload
        },
      };

      const program = createProgramWithComponentUsage(componentDef, props);

      // Act
      const result = analyzePass(program);

      // Assert
      // Should fail due to undefined state in the EventHandler payload
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
      }
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should accept component with only EventHandler props', () => {
      // Arrange
      const componentDef: ComponentDef = {
        params: {
          onOpen: { type: 'any', required: false },
          onClose: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'dialog' },
      } as unknown as ComponentDef;

      const props = {
        onOpen: { event: 'click', action: 'handleClick' },
        onClose: { event: 'click', action: 'handleClick' },
      };

      const program = createProgramWithComponentUsage(componentDef, props);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate expression props normally even with EventHandler props present', () => {
      // Arrange
      // This test ensures that expression props are still validated correctly
      const componentDef: ComponentDef = {
        params: {
          data: { type: 'list', required: true },
          onClick: { type: 'any', required: false },
        },
        view: { kind: 'element', tag: 'div' },
      } as unknown as ComponentDef;

      const program: Program = {
        version: '1.0',
        state: {},
        actions: [{ name: 'handleClick', steps: [] }],
        view: {
          kind: 'component',
          name: 'ListComponent',
          props: {
            data: { expr: 'state', name: 'undefinedState' }, // Invalid: references undefined state
            onClick: { event: 'click', action: 'handleClick' }, // Valid EventHandler
          },
        },
        components: {
          ListComponent: componentDef,
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // Should fail due to undefined state, NOT due to EventHandler
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.code === 'UNDEFINED_STATE')).toBe(true);
        // Should only have the UNDEFINED_STATE error, not any error related to EventHandler
        expect(result.errors.length).toBe(1);
      }
    });

    it('should validate EventHandler action references against localActions when in component context', () => {
      // Arrange
      // Component with localActions - the EventHandler should be able to reference them
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'component',
          name: 'AccordionWrapper',
          props: {},
        },
        components: {
          AccordionWrapper: {
            view: {
              kind: 'component',
              name: 'Accordion',
              props: {
                onToggle: { event: 'click', action: 'toggleExpand' }, // Should reference localAction
              },
            },
          },
          Accordion: {
            params: {
              onToggle: { type: 'any', required: false },
            },
            localState: {
              isExpanded: { type: 'boolean', initial: false },
            },
            localActions: [
              {
                name: 'toggleExpand',
                steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
              },
            ],
            view: { kind: 'element', tag: 'div' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      // The EventHandler references 'toggleExpand' which is a localAction of AccordionWrapper
      // This test will FAIL if localAction validation is not implemented for component props
      // Note: This tests whether the validation considers the caller's scope (AccordionWrapper),
      // not the callee's scope (Accordion)
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should fail because 'toggleExpand' is not in scope at the call site
        // (it's in Accordion's localActions, not AccordionWrapper's)
        expect(result.errors.some((e) => e.code === 'UNDEFINED_ACTION')).toBe(true);
      }
    });
  });
});
