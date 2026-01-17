/**
 * Test module for Component Local State analysis.
 *
 * Coverage:
 * - Components with localState field are accepted
 * - localActions with toggle operation are validated
 * - UNDEFINED_LOCAL_STATE error when localAction references undefined localState
 * - LOCAL_ACTION_INVALID_STEP error when localAction contains fetch step
 * - Event handlers referencing localAction are validated
 *
 * TDD Red Phase: These tests verify the semantic analysis of component-level
 * local state that will be added to support independent state per component instance.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program, ComponentDef } from '@constela/core';

describe('analyzePass with Component Local State', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program with components for testing local state analysis
   */
  function createProgramWithComponent(
    componentDef: ComponentDef & {
      localState?: Record<string, { type: string; initial: unknown }>;
      localActions?: Array<{ name: string; steps: unknown[] }>;
    },
    componentName: string = 'TestComponent'
  ): Program {
    return {
      version: '1.0',
      state: {},
      actions: [],
      view: {
        kind: 'component',
        name: componentName,
        props: {},
      },
      components: {
        [componentName]: componentDef,
      },
    } as unknown as Program;
  }

  // ==================== Valid Local State ====================

  describe('valid localState', () => {
    it('should accept component with localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept component with multiple localState fields', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
          count: { type: 'number', initial: 0 },
          selectedItem: { type: 'string', initial: '' },
        },
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept component with localState of all types', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          flag: { type: 'boolean', initial: true },
          counter: { type: 'number', initial: 42 },
          label: { type: 'string', initial: 'Hello' },
          items: { type: 'list', initial: [] },
          data: { type: 'object', initial: {} },
        },
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept component without localState field', () => {
      // Arrange
      const program = createProgramWithComponent({
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Valid Local Actions ====================

  describe('valid localActions', () => {
    it('should accept localActions with toggle operation', () => {
      // Arrange
      const program = createProgramWithComponent({
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
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept localActions with set step', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          count: { type: 'number', initial: 0 },
        },
        localActions: [
          {
            name: 'resetCount',
            steps: [{ do: 'set', target: 'count', value: { expr: 'lit', value: 0 } }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept localActions with increment operation', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          count: { type: 'number', initial: 0 },
        },
        localActions: [
          {
            name: 'incrementCount',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept multiple localActions', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
          count: { type: 'number', initial: 0 },
        },
        localActions: [
          {
            name: 'toggleExpand',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
          {
            name: 'incrementCount',
            steps: [{ do: 'update', target: 'count', operation: 'increment' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept localActions with push operation on list', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          items: { type: 'list', initial: [] },
        },
        localActions: [
          {
            name: 'addItem',
            steps: [
              {
                do: 'update',
                target: 'items',
                operation: 'push',
                value: { expr: 'var', name: 'payload' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Invalid Local Actions ====================

  describe('invalid localActions', () => {
    it('should reject localAction referencing undefined localState (UNDEFINED_LOCAL_STATE error)', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'toggleUndefined',
            steps: [{ do: 'update', target: 'nonExistentState', operation: 'toggle' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_LOCAL_STATE');
        expect(result.errors[0]?.message).toContain('nonExistentState');
      }
    });

    it('should reject localAction with fetch step (LOCAL_ACTION_INVALID_STEP error)', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          data: { type: 'object', initial: {} },
        },
        localActions: [
          {
            name: 'loadData',
            steps: [
              {
                do: 'fetch',
                url: { expr: 'lit', value: '/api/data' },
                result: 'response',
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('LOCAL_ACTION_INVALID_STEP');
        expect(result.errors[0]?.message).toContain('fetch');
      }
    });

    it('should reject localAction with navigate step', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'goSomewhere',
            steps: [
              {
                do: 'navigate',
                url: { expr: 'lit', value: '/other-page' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('LOCAL_ACTION_INVALID_STEP');
      }
    });

    it('should reject localAction with storage step', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          value: { type: 'string', initial: '' },
        },
        localActions: [
          {
            name: 'saveToStorage',
            steps: [
              {
                do: 'storage',
                operation: 'set',
                key: { expr: 'lit', value: 'myKey' },
                value: { expr: 'lit', value: 'myValue' },
                storage: 'local',
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('LOCAL_ACTION_INVALID_STEP');
      }
    });

    it('should reject localAction referencing global state', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          globalCount: { type: 'number', initial: 0 },
        },
        actions: [],
        view: {
          kind: 'component',
          name: 'TestComponent',
          props: {},
        },
        components: {
          TestComponent: {
            localState: {
              localCount: { type: 'number', initial: 0 },
            },
            localActions: [
              {
                name: 'updateGlobal',
                steps: [
                  { do: 'update', target: 'globalCount', operation: 'increment' },
                ],
              },
            ],
            view: { kind: 'element', tag: 'div' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // localAction should only reference localState, not global state
        expect(result.errors[0]?.code).toBe('UNDEFINED_LOCAL_STATE');
      }
    });

    it('should provide meaningful error path for invalid localAction', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'invalidAction',
            steps: [{ do: 'update', target: 'undefinedState', operation: 'toggle' }],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      }, 'MyComponent');

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('components');
        expect(result.errors[0]?.path).toContain('MyComponent');
        expect(result.errors[0]?.path).toContain('localActions');
      }
    });
  });

  // ==================== Event Handlers with Local Actions ====================

  describe('event handlers referencing localAction', () => {
    it('should accept event handler referencing localAction', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'toggleExpand',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
        ],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onClick: { event: 'click', action: 'toggleExpand' },
          },
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept event handler with payload referencing localAction', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          selectedId: { type: 'string', initial: '' },
        },
        localActions: [
          {
            name: 'selectItem',
            steps: [
              { do: 'set', target: 'selectedId', value: { expr: 'var', name: 'payload' } },
            ],
          },
        ],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onClick: {
              event: 'click',
              action: 'selectItem',
              payload: { expr: 'lit', value: 'item-123' },
            },
          },
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should reject event handler referencing undefined localAction', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'toggleExpand',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
        ],
        view: {
          kind: 'element',
          tag: 'button',
          props: {
            onClick: { event: 'click', action: 'nonExistentAction' },
          },
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should report either UNDEFINED_ACTION or a specific local action error
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  // ==================== Local State Expression References ====================

  describe('local state expression references', () => {
    it('should accept state expression referencing localState in view', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: {
            className: {
              expr: 'cond',
              if: { expr: 'state', name: 'isExpanded' },
              then: { expr: 'lit', value: 'expanded' },
              else: { expr: 'lit', value: 'collapsed' },
            },
          },
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should accept local state reference in if condition', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          showDetails: { type: 'boolean', initial: false },
        },
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'showDetails' },
          then: {
            kind: 'element',
            tag: 'div',
            children: [{ kind: 'text', value: { expr: 'lit', value: 'Details shown' } }],
          },
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle component with params and localState', () => {
      // Arrange
      const program = createProgramWithComponent({
        params: {
          title: { type: 'string', required: false },  // Optional param for this test
        },
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'toggle',
            steps: [{ do: 'update', target: 'isExpanded', operation: 'toggle' }],
          },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'param', name: 'title' } },
          ],
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle nested component using localState', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'component',
          name: 'ParentComponent',
          props: {},
        },
        components: {
          ParentComponent: {
            localState: {
              parentExpanded: { type: 'boolean', initial: true },
            },
            view: {
              kind: 'element',
              tag: 'div',
              children: [
                {
                  kind: 'component',
                  name: 'ChildComponent',
                  props: {},
                },
              ],
            },
          },
          ChildComponent: {
            localState: {
              childExpanded: { type: 'boolean', initial: false },
            },
            localActions: [
              {
                name: 'toggleChild',
                steps: [{ do: 'update', target: 'childExpanded', operation: 'toggle' }],
              },
            ],
            view: {
              kind: 'element',
              tag: 'span',
            },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should report multiple errors for multiple invalid localActions', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [
          {
            name: 'invalidAction1',
            steps: [{ do: 'update', target: 'undefinedState1', operation: 'toggle' }],
          },
          {
            name: 'invalidAction2',
            steps: [
              {
                do: 'fetch',
                url: { expr: 'lit', value: '/api' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should handle empty localActions array', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {
          isExpanded: { type: 'boolean', initial: false },
        },
        localActions: [],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle empty localState object', () => {
      // Arrange
      const program = createProgramWithComponent({
        localState: {},
        localActions: [],
        view: { kind: 'element', tag: 'div' },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});
