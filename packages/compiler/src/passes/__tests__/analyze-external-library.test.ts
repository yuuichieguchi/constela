/**
 * Test module for External Library Integration analysis.
 *
 * Coverage:
 * - RefExpr validation (ref references in view)
 * - ImportStep validation (dynamic module imports)
 * - CallStep validation (external function calls)
 * - SubscribeStep validation (event subscriptions)
 * - DisposeStep validation (resource cleanup)
 * - ElementNode.ref collection from view tree
 *
 * TDD Red Phase: These tests verify the semantic analysis of external library
 * integration features that will be added to support dynamic imports, DOM refs,
 * external function calls, event subscriptions, and resource cleanup in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { analyzePass } from '../analyze.js';
import type { Program } from '@constela/core';

describe('analyzePass - external library integration', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal Program for testing external library analysis
   */
  function createProgram(overrides: Partial<Program> = {}): Program {
    return {
      version: '1.0',
      state: {},
      actions: [],
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    } as Program;
  }

  /**
   * Creates a Program with specified action steps
   */
  function createProgramWithAction(
    steps: unknown[],
    state: Record<string, unknown> = {},
    additionalOverrides: Partial<Program> = {}
  ): Program {
    return {
      version: '1.0',
      state,
      actions: [
        {
          name: 'testAction',
          steps,
        },
      ],
      view: { kind: 'element', tag: 'div' },
      ...additionalOverrides,
    } as unknown as Program;
  }

  // ==================== Ref Collection Tests ====================

  describe('ref collection', () => {
    it('should collect refs from element nodes', () => {
      // Arrange
      const program = createProgram({
        view: {
          kind: 'element',
          tag: 'div',
          ref: 'container',
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      // RefExpr validation will need refs collected from view
      expect(result.ok).toBe(true);
    });

    it('should collect refs from nested elements', () => {
      // Arrange
      const program = createProgram({
        view: {
          kind: 'element',
          tag: 'div',
          ref: 'outer',
          children: [
            {
              kind: 'element',
              tag: 'div',
              ref: 'inner',
            },
          ],
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should collect refs from if/then/else branches', () => {
      // Arrange
      const program = createProgram({
        state: {
          showEditor: { type: 'boolean', initial: true },
        },
        view: {
          kind: 'if',
          condition: { expr: 'state', name: 'showEditor' },
          then: {
            kind: 'element',
            tag: 'div',
            ref: 'editorContainer',
          },
          else: {
            kind: 'element',
            tag: 'div',
            ref: 'placeholder',
          },
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should collect refs from each body', () => {
      // Arrange
      const program = createProgram({
        state: {
          items: { type: 'list', initial: [] },
        },
        view: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: {
            kind: 'element',
            tag: 'div',
            ref: 'itemContainer',
          },
        },
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== RefExpr Validation Tests ====================

  describe('RefExpr validation', () => {
    it('should pass when ref is defined in view', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'monaco', path: 'editor.create' },
            args: [{ expr: 'ref', name: 'editorContainer' }],
            result: 'editor',
          },
        ],
        {
          editorLoaded: { type: 'boolean', initial: false },
        },
        {
          view: {
            kind: 'element',
            tag: 'div',
            ref: 'editorContainer',
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      // This test should FAIL initially because RefExpr validation is not implemented
      expect(result.ok).toBe(true);
    });

    it('should fail when ref is not defined in view', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'monaco', path: 'editor.create' },
            args: [{ expr: 'ref', name: 'nonExistentRef' }],
          },
        ],
        {},
        {
          view: {
            kind: 'element',
            tag: 'div',
            // No ref defined here
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      // This test should FAIL initially because RefExpr validation is not implemented
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_REF');
      }
    });

    it('should fail when using ref from different branch of if node', () => {
      // Arrange
      // Ref defined in 'then' branch should be available
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'init' },
            args: [{ expr: 'ref', name: 'thenContainer' }],
          },
        ],
        { show: { type: 'boolean', initial: true } },
        {
          view: {
            kind: 'if',
            condition: { expr: 'state', name: 'show' },
            then: {
              kind: 'element',
              tag: 'div',
              ref: 'thenContainer',
            },
            else: {
              kind: 'element',
              tag: 'div',
              ref: 'elseContainer',
            },
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      // Refs from conditional branches should still be considered valid
      // (runtime will handle the conditional availability)
      expect(result.ok).toBe(true);
    });

    it('should provide meaningful error path for undefined ref', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'initEditor',
            steps: [
              {
                do: 'call',
                target: { expr: 'var', name: 'monaco', path: 'editor.create' },
                args: [{ expr: 'ref', name: 'undefinedRef' }],
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/actions/0/steps/0');
      }
    });
  });

  // ==================== ImportStep Validation Tests ====================

  describe('ImportStep validation', () => {
    it('should pass with valid import step', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'import',
          module: 'monaco-editor',
          result: 'monaco',
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate onSuccess steps recursively', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'monaco-editor',
            result: 'monaco',
            onSuccess: [
              { do: 'set', target: 'editorLoaded', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        { editorLoaded: { type: 'boolean', initial: false } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate onError steps recursively', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'monaco-editor',
            result: 'monaco',
            onError: [
              { do: 'set', target: 'loadError', value: { expr: 'lit', value: 'Failed' } },
            ],
          },
        ],
        { loadError: { type: 'string', initial: '' } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when onSuccess references undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'import',
          module: 'monaco-editor',
          result: 'monaco',
          onSuccess: [
            { do: 'set', target: 'undefinedState', value: { expr: 'lit', value: true } },
          ],
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should fail when onError references undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'import',
          module: 'monaco-editor',
          result: 'monaco',
          onError: [
            { do: 'set', target: 'undefinedState', value: { expr: 'lit', value: 'error' } },
          ],
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should accept various module names', () => {
      // Arrange
      const modules = [
        'monaco-editor',
        '@codemirror/state',
        'three',
        'chart.js',
        'leaflet',
        '@xterm/xterm',
      ];

      for (const moduleName of modules) {
        const program = createProgramWithAction([
          {
            do: 'import',
            module: moduleName,
            result: 'lib',
          },
        ]);

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      }
    });
  });

  // ==================== CallStep Validation Tests ====================

  describe('CallStep validation', () => {
    it('should pass with valid call step', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate target expression state references', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'state', name: 'editorInstance' },
          },
        ],
        { editorInstance: { type: 'object', initial: {} } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when target references undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'state', name: 'undefinedState' },
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should validate args expressions', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'func' },
            args: [
              { expr: 'state', name: 'config' },
              { expr: 'lit', value: 'option' },
            ],
          },
        ],
        { config: { type: 'object', initial: {} } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when args reference undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'lib', path: 'func' },
          args: [
            { expr: 'state', name: 'undefinedConfig' },
          ],
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should validate onSuccess steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'func' },
            result: 'callResult',
            onSuccess: [
              { do: 'set', target: 'ready', value: { expr: 'lit', value: true } },
            ],
          },
        ],
        { ready: { type: 'boolean', initial: false } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate onError steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'func' },
            onError: [
              { do: 'set', target: 'error', value: { expr: 'var', name: 'error', path: 'message' } },
            ],
          },
        ],
        { error: { type: 'string', initial: '' } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when onSuccess references undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'lib', path: 'func' },
          onSuccess: [
            { do: 'set', target: 'undefinedState', value: { expr: 'lit', value: true } },
          ],
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should accept call with RefExpr in args', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'monaco', path: 'editor.create' },
            args: [
              { expr: 'ref', name: 'editorContainer' },
              { expr: 'lit', value: { language: 'typescript' } },
            ],
          },
        ],
        {},
        {
          view: {
            kind: 'element',
            tag: 'div',
            ref: 'editorContainer',
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should provide meaningful error path for invalid call step', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'testAction',
            steps: [
              {
                do: 'call',
                target: { expr: 'state', name: 'undefinedTarget' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/actions/0/steps/0');
      }
    });
  });

  // ==================== SubscribeStep Validation Tests ====================

  describe('SubscribeStep validation', () => {
    it('should pass with valid subscribe step', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'subscribe',
            target: { expr: 'state', name: 'editorInstance' },
            event: 'onDidChangeModelContent',
            action: 'handleEditorChange',
          },
        ],
        { editorInstance: { type: 'object', initial: {} } }
      );

      // Add the referenced action
      (program.actions as unknown[]).push({
        name: 'handleEditorChange',
        steps: [],
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when action is not defined', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'subscribe',
            target: { expr: 'state', name: 'editorInstance' },
            event: 'onDidChangeModelContent',
            action: 'undefinedAction',
          },
        ],
        { editorInstance: { type: 'object', initial: {} } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_ACTION');
      }
    });

    it('should validate target expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'subscribe',
            target: { expr: 'state', name: 'editorInstance' },
            event: 'onChange',
            action: 'handleChange',
          },
        ],
        { editorInstance: { type: 'object', initial: {} } }
      );

      // Add the referenced action
      (program.actions as unknown[]).push({
        name: 'handleChange',
        steps: [],
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when target references undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'subscribe',
          target: { expr: 'state', name: 'undefinedEditor' },
          event: 'onChange',
          action: 'handleChange',
        },
      ]);

      // Add the referenced action
      (program.actions as unknown[]).push({
        name: 'handleChange',
        steps: [],
      });

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should accept various event names', () => {
      // Arrange
      const events = [
        'onDidChangeModelContent',
        'onDidChangeCursorPosition',
        'onClick',
        'onZoomEnd',
        'onData',
      ];

      for (const event of events) {
        const program = createProgramWithAction(
          [
            {
              do: 'subscribe',
              target: { expr: 'state', name: 'instance' },
              event,
              action: 'handler',
            },
          ],
          { instance: { type: 'object', initial: {} } }
        );

        // Add the referenced action
        (program.actions as unknown[]).push({
          name: 'handler',
          steps: [],
        });

        // Act
        const result = analyzePass(program);

        // Assert
        expect(result.ok).toBe(true);
      }
    });

    it('should provide meaningful error path for invalid subscribe step', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          editor: { type: 'object', initial: {} },
        },
        actions: [
          {
            name: 'testAction',
            steps: [
              {
                do: 'subscribe',
                target: { expr: 'state', name: 'editor' },
                event: 'onChange',
                action: 'undefinedHandler',
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/actions/0/steps/0');
      }
    });
  });

  // ==================== DisposeStep Validation Tests ====================

  describe('DisposeStep validation', () => {
    it('should pass with valid dispose step', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'editorInstance' },
          },
        ],
        { editorInstance: { type: 'object', initial: {} } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate target expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'subscription' },
          },
        ],
        { subscription: { type: 'object', initial: {} } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when target references undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'dispose',
          target: { expr: 'state', name: 'undefinedInstance' },
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should accept target with get expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'dispose',
            target: {
              expr: 'get',
              base: { expr: 'state', name: 'resources' },
              path: 'editor',
            },
          },
        ],
        { resources: { type: 'object', initial: {} } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should fail when get expression base references undefined state', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'dispose',
          target: {
            expr: 'get',
            base: { expr: 'state', name: 'undefinedResources' },
            path: 'editor',
          },
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.code).toBe('UNDEFINED_STATE');
      }
    });

    it('should provide meaningful error path for invalid dispose step', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'cleanup',
            steps: [
              {
                do: 'dispose',
                target: { expr: 'state', name: 'undefinedInstance' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0]?.path).toContain('/actions/0/steps/0');
      }
    });
  });

  // ==================== Integration Scenarios Tests ====================

  describe('integration scenarios', () => {
    it('should validate Monaco Editor integration pattern', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          monacoLoaded: { type: 'boolean', initial: false },
          editorInstance: { type: 'object', initial: {} },
          editorReady: { type: 'boolean', initial: false },
          code: { type: 'string', initial: '' },
        },
        lifecycle: {
          onMount: 'initEditor',
          onUnmount: 'disposeEditor',
        },
        actions: [
          {
            name: 'initEditor',
            steps: [
              {
                do: 'import',
                module: 'monaco-editor',
                result: 'monaco',
                onSuccess: [
                  { do: 'set', target: 'monacoLoaded', value: { expr: 'lit', value: true } },
                ],
              },
              {
                do: 'call',
                target: { expr: 'var', name: 'monaco', path: 'editor.create' },
                args: [
                  { expr: 'ref', name: 'editorContainer' },
                  { expr: 'lit', value: { language: 'typescript', theme: 'vs-dark' } },
                ],
                result: 'editorInstance',
                onSuccess: [
                  { do: 'set', target: 'editorReady', value: { expr: 'lit', value: true } },
                ],
              },
              {
                do: 'subscribe',
                target: { expr: 'state', name: 'editorInstance' },
                event: 'onDidChangeModelContent',
                action: 'handleEditorChange',
              },
            ],
          },
          {
            name: 'handleEditorChange',
            steps: [
              { do: 'set', target: 'code', value: { expr: 'var', name: 'event', path: 'getValue' } },
            ],
          },
          {
            name: 'disposeEditor',
            steps: [
              {
                do: 'dispose',
                target: { expr: 'state', name: 'editorInstance' },
              },
            ],
          },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          ref: 'editorContainer',
          props: {
            className: { expr: 'lit', value: 'editor-wrapper' },
            style: { expr: 'lit', value: 'height: 400px' },
          },
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should validate Chart.js integration pattern', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          chartInstance: { type: 'object', initial: {} },
          chartConfig: { type: 'object', initial: { type: 'bar', data: {} } },
        },
        lifecycle: {
          onMount: 'initChart',
          onUnmount: 'disposeChart',
        },
        actions: [
          {
            name: 'initChart',
            steps: [
              {
                do: 'import',
                module: 'chart.js',
                result: 'Chart',
              },
              {
                do: 'call',
                target: { expr: 'var', name: 'Chart' },
                args: [
                  { expr: 'ref', name: 'chartCanvas' },
                  { expr: 'state', name: 'chartConfig' },
                ],
                result: 'chartInstance',
              },
            ],
          },
          {
            name: 'disposeChart',
            steps: [
              {
                do: 'dispose',
                target: { expr: 'state', name: 'chartInstance' },
              },
            ],
          },
        ],
        view: {
          kind: 'element',
          tag: 'canvas',
          ref: 'chartCanvas',
        },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should collect multiple errors from invalid external library steps', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [
          {
            name: 'brokenInit',
            steps: [
              {
                do: 'call',
                target: { expr: 'state', name: 'undefinedLib' },
              },
              {
                do: 'subscribe',
                target: { expr: 'state', name: 'undefinedInstance' },
                event: 'onChange',
                action: 'undefinedAction',
              },
              {
                do: 'dispose',
                target: { expr: 'state', name: 'anotherUndefined' },
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should have at least 3 errors (one for each invalid step)
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should validate nested external library calls in onSuccess', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          lib: { type: 'object', initial: {} },
          ready: { type: 'boolean', initial: false },
        },
        actions: [
          {
            name: 'nestedInit',
            steps: [
              {
                do: 'import',
                module: 'some-lib',
                result: 'lib',
                onSuccess: [
                  {
                    do: 'call',
                    target: { expr: 'var', name: 'lib', path: 'init' },
                    onSuccess: [
                      { do: 'set', target: 'ready', value: { expr: 'lit', value: true } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        view: { kind: 'element', tag: 'div' },
      } as unknown as Program;

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });
  });

  // ==================== Edge Cases Tests ====================

  describe('edge cases', () => {
    it('should handle empty args array in call step', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'lib', path: 'noArgs' },
          args: [],
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle call step without optional fields', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'lib', path: 'func' },
          // No args, result, onSuccess, or onError
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle import step without callbacks', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'import',
          module: 'simple-lib',
          result: 'lib',
          // No onSuccess or onError
        },
      ]);

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle deeply nested call expressions', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'state', name: 'lib' },
                path: 'module',
              },
              path: 'subModule.func',
            },
          },
        ],
        { lib: { type: 'object', initial: {} } }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('should handle ref in binary expression args', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'func' },
            args: [
              {
                expr: 'bin',
                op: '+',
                left: { expr: 'ref', name: 'container' },
                right: { expr: 'lit', value: '-child' },
              },
            ],
          },
        ],
        {},
        {
          view: {
            kind: 'element',
            tag: 'div',
            ref: 'container',
          },
        }
      );

      // Act
      const result = analyzePass(program);

      // Assert
      // This test documents expected behavior for RefExpr in binary expressions
      // RefExpr should be validated even when nested in binary expressions
      expect(result.ok).toBe(true);
    });
  });
});
