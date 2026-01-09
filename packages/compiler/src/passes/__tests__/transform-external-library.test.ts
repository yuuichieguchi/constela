/**
 * Test module for External Library Integration transformation.
 *
 * Coverage:
 * - RefExpr transforms to CompiledRefExpr
 * - ElementNode.ref preserved in transformation
 * - ImportStep transforms to CompiledImportStep
 * - CallStep transforms to CompiledCallStep
 * - SubscribeStep transforms to CompiledSubscribeStep
 * - DisposeStep transforms to CompiledDisposeStep
 * - Expression transformation within external library steps
 *
 * TDD Red Phase: These tests verify the transformation of external library
 * integration features that will be added to support dynamic imports, DOM refs,
 * external function calls, event subscriptions, and resource cleanup in Constela DSL.
 */

import { describe, it, expect } from 'vitest';
import { transformPass } from '../transform.js';
import type { Program } from '@constela/core';
import type { AnalysisContext } from '../analyze.js';

describe('transformPass - external library integration', () => {
  // ==================== Helper Functions ====================

  /**
   * Creates a minimal AnalysisContext for testing
   */
  function createContext(options: {
    stateNames?: string[];
    actionNames?: string[];
    routeParams?: string[];
    importNames?: string[];
    refNames?: string[];
  } = {}): AnalysisContext {
    return {
      stateNames: new Set<string>(options.stateNames ?? []),
      actionNames: new Set<string>(options.actionNames ?? []),
      componentNames: new Set<string>(),
      routeParams: new Set<string>(options.routeParams ?? []),
      importNames: new Set<string>(options.importNames ?? []),
      dataNames: new Set<string>(),
      refNames: new Set<string>(options.refNames ?? []),
    };
  }

  /**
   * Creates a minimal Program for testing external library transformation
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

  // ==================== RefExpr Transformation ====================

  describe('RefExpr transformation', () => {
    it('should transform RefExpr in action step args', () => {
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
            result: 'editor',
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

      const context = createContext({ refNames: ['editorContainer'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        args?: Array<{ expr: string; name?: string }>;
      };
      // RefExpr should be transformed to CompiledRefExpr
      expect(step.args?.[0]?.expr).toBe('ref');
      expect(step.args?.[0]?.name).toBe('editorContainer');
    });

    it('should preserve ref name in transformation', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'init' },
            args: [{ expr: 'ref', name: 'customContainer' }],
          },
        ],
        {},
        {
          view: {
            kind: 'element',
            tag: 'div',
            ref: 'customContainer',
          },
        }
      );

      const context = createContext({ refNames: ['customContainer'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        args?: Array<{ expr: string; name: string }>;
      };
      expect(step.args?.[0]?.name).toBe('customContainer');
    });

    it('should transform RefExpr in nested expressions', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'createPair' },
            args: [
              { expr: 'ref', name: 'container1' },
              { expr: 'ref', name: 'container2' },
            ],
          },
        ],
        {},
        {
          view: {
            kind: 'element',
            tag: 'div',
            children: [
              { kind: 'element', tag: 'div', ref: 'container1' },
              { kind: 'element', tag: 'div', ref: 'container2' },
            ],
          },
        }
      );

      const context = createContext({ refNames: ['container1', 'container2'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        args?: Array<{ expr: string; name: string }>;
      };
      expect(step.args?.[0]?.expr).toBe('ref');
      expect(step.args?.[1]?.expr).toBe('ref');
    });
  });

  // ==================== ElementNode.ref Transformation ====================

  describe('ElementNode.ref transformation', () => {
    it('should preserve ref attribute on element nodes', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          ref: 'container',
        },
      } as unknown as Program;

      const context = createContext({ refNames: ['container'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { kind: string; tag: string; ref?: string };
      expect(view.kind).toBe('element');
      expect(view.tag).toBe('div');
      expect(view.ref).toBe('container');
    });

    it('should handle elements without ref', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
        view: {
          kind: 'element',
          tag: 'div',
          // No ref attribute
        },
      };

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as { ref?: string };
      expect(view.ref).toBeUndefined();
    });

    it('should preserve ref on nested elements', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {},
        actions: [],
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
      } as unknown as Program;

      const context = createContext({ refNames: ['outer', 'inner'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as {
        ref?: string;
        children?: Array<{ ref?: string }>;
      };
      expect(view.ref).toBe('outer');
      expect(view.children?.[0]?.ref).toBe('inner');
    });

    it('should preserve ref in if node branches', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          show: { type: 'boolean', initial: true },
        },
        actions: [],
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
      } as unknown as Program;

      const context = createContext({
        stateNames: ['show'],
        refNames: ['thenContainer', 'elseContainer'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as {
        then: { ref?: string };
        else?: { ref?: string };
      };
      expect(view.then.ref).toBe('thenContainer');
      expect(view.else?.ref).toBe('elseContainer');
    });

    it('should preserve ref in each node body', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          items: { type: 'list', initial: [] },
        },
        actions: [],
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
      } as unknown as Program;

      const context = createContext({
        stateNames: ['items'],
        refNames: ['itemContainer'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const view = result.view as {
        body: { ref?: string };
      };
      expect(view.body.ref).toBe('itemContainer');
    });
  });

  // ==================== ImportStep Transformation ====================

  describe('ImportStep transformation', () => {
    it('should transform import step with module and result', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'import',
          module: 'monaco-editor',
          result: 'monaco',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'import',
        module: 'monaco-editor',
        result: 'monaco',
      });
    });

    it('should transform onSuccess steps recursively', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'monaco-editor',
            result: 'monaco',
            onSuccess: [
              { do: 'set', target: 'monacoLoaded', value: { expr: 'lit', value: true } },
              { do: 'set', target: 'loadStatus', value: { expr: 'lit', value: 'success' } },
            ],
          },
        ],
        {
          monacoLoaded: { type: 'boolean', initial: false },
          loadStatus: { type: 'string', initial: '' },
        }
      );

      const context = createContext({ stateNames: ['monacoLoaded', 'loadStatus'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onSuccess?: Array<{ do: string; target: string; value: { expr: string } }>;
      };
      expect(step.onSuccess).toBeDefined();
      expect(step.onSuccess?.length).toBe(2);
      expect(step.onSuccess?.[0]?.do).toBe('set');
      expect(step.onSuccess?.[0]?.value.expr).toBe('lit');
    });

    it('should transform onError steps recursively', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'monaco-editor',
            result: 'monaco',
            onError: [
              { do: 'set', target: 'loadError', value: { expr: 'var', name: 'error', path: 'message' } },
            ],
          },
        ],
        {
          loadError: { type: 'string', initial: '' },
        }
      );

      const context = createContext({ stateNames: ['loadError'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onError?: Array<{ do: string; value: { expr: string; name: string } }>;
      };
      expect(step.onError).toBeDefined();
      expect(step.onError?.length).toBe(1);
      expect(step.onError?.[0]?.value.expr).toBe('var');
      expect(step.onError?.[0]?.value.name).toBe('error');
    });

    it('should transform nested steps in onSuccess with state expressions', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'chart.js',
            result: 'Chart',
            onSuccess: [
              {
                do: 'set',
                target: 'chartConfig',
                value: {
                  expr: 'bin',
                  op: '+',
                  left: { expr: 'state', name: 'baseConfig' },
                  right: { expr: 'lit', value: {} },
                },
              },
            ],
          },
        ],
        {
          chartConfig: { type: 'object', initial: {} },
          baseConfig: { type: 'object', initial: {} },
        }
      );

      const context = createContext({ stateNames: ['chartConfig', 'baseConfig'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onSuccess?: Array<{ value: { expr: string; left: { expr: string } } }>;
      };
      expect(step.onSuccess?.[0]?.value.expr).toBe('bin');
      expect(step.onSuccess?.[0]?.value.left.expr).toBe('state');
    });
  });

  // ==================== CallStep Transformation ====================

  describe('CallStep transformation', () => {
    it('should transform call step with target expression', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        do: string;
        target: { expr: string; name: string; path: string };
      };
      expect(step.do).toBe('call');
      expect(step.target.expr).toBe('var');
      expect(step.target.name).toBe('monaco');
      expect(step.target.path).toBe('editor.create');
    });

    it('should transform args expressions', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'init' },
            args: [
              { expr: 'state', name: 'config' },
              { expr: 'lit', value: { debug: true } },
              { expr: 'var', name: 'options' },
            ],
          },
        ],
        { config: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['config'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        args?: Array<{ expr: string }>;
      };
      expect(step.args?.length).toBe(3);
      expect(step.args?.[0]?.expr).toBe('state');
      expect(step.args?.[1]?.expr).toBe('lit');
      expect(step.args?.[2]?.expr).toBe('var');
    });

    it('should transform call step with result and onSuccess/onError', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'monaco', path: 'editor.create' },
            args: [
              { expr: 'ref', name: 'container' },
              { expr: 'lit', value: { language: 'javascript' } },
            ],
            result: 'editorInstance',
            onSuccess: [
              { do: 'set', target: 'editorReady', value: { expr: 'lit', value: true } },
            ],
            onError: [
              { do: 'set', target: 'editorError', value: { expr: 'var', name: 'error' } },
            ],
          },
        ],
        {
          editorReady: { type: 'boolean', initial: false },
          editorError: { type: 'object', initial: {} },
        },
        {
          view: {
            kind: 'element',
            tag: 'div',
            ref: 'container',
          },
        }
      );

      const context = createContext({
        stateNames: ['editorReady', 'editorError'],
        refNames: ['container'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        result?: string;
        onSuccess?: Array<{ do: string }>;
        onError?: Array<{ do: string }>;
      };
      expect(step.result).toBe('editorInstance');
      expect(step.onSuccess?.length).toBe(1);
      expect(step.onError?.length).toBe(1);
    });

    it('should transform target with get expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: {
              expr: 'get',
              base: { expr: 'state', name: 'lib' },
              path: 'module.func',
            },
          },
        ],
        { lib: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['lib'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        target: { expr: string; base: { expr: string }; path: string };
      };
      expect(step.target.expr).toBe('get');
      expect(step.target.base.expr).toBe('state');
      expect(step.target.path).toBe('module.func');
    });

    it('should transform call with binary expression in args', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'setConfig' },
            args: [
              {
                expr: 'bin',
                op: '+',
                left: { expr: 'state', name: 'baseUrl' },
                right: { expr: 'lit', value: '/api' },
              },
            ],
          },
        ],
        { baseUrl: { type: 'string', initial: '' } }
      );

      const context = createContext({ stateNames: ['baseUrl'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        args?: Array<{ expr: string; left: { expr: string }; right: { expr: string } }>;
      };
      expect(step.args?.[0]?.expr).toBe('bin');
      expect(step.args?.[0]?.left.expr).toBe('state');
      expect(step.args?.[0]?.right.expr).toBe('lit');
    });
  });

  // ==================== SubscribeStep Transformation ====================

  describe('SubscribeStep transformation', () => {
    it('should transform subscribe step with target, event, action', () => {
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

      const context = createContext({
        stateNames: ['editorInstance'],
        actionNames: ['testAction', 'handleEditorChange'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'subscribe',
        target: { expr: 'state', name: 'editorInstance' },
        event: 'onDidChangeModelContent',
        action: 'handleEditorChange',
      });
    });

    it('should transform target expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'subscribe',
            target: {
              expr: 'get',
              base: { expr: 'state', name: 'resources' },
              path: 'editor',
            },
            event: 'onChange',
            action: 'handleChange',
          },
        ],
        { resources: { type: 'object', initial: {} } }
      );

      (program.actions as unknown[]).push({
        name: 'handleChange',
        steps: [],
      });

      const context = createContext({
        stateNames: ['resources'],
        actionNames: ['testAction', 'handleChange'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        target: { expr: string; base: { expr: string }; path: string };
      };
      expect(step.target.expr).toBe('get');
      expect(step.target.base.expr).toBe('state');
      expect(step.target.path).toBe('editor');
    });

    it('should transform subscribe with var target', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'subscribe',
          target: { expr: 'var', name: 'instance', path: 'model' },
          event: 'onUpdate',
          action: 'handleUpdate',
        },
      ]);

      (program.actions as unknown[]).push({
        name: 'handleUpdate',
        steps: [],
      });

      const context = createContext({
        actionNames: ['testAction', 'handleUpdate'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        target: { expr: string; name: string; path?: string };
      };
      expect(step.target.expr).toBe('var');
      expect(step.target.name).toBe('instance');
      expect(step.target.path).toBe('model');
    });

    it('should preserve event name in transformation', () => {
      // Arrange
      const eventNames = [
        'onDidChangeModelContent',
        'onDidChangeCursorPosition',
        'onClick',
        'onZoomEnd',
        'onData',
      ];

      for (const event of eventNames) {
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

        (program.actions as unknown[]).push({
          name: 'handler',
          steps: [],
        });

        const context = createContext({
          stateNames: ['instance'],
          actionNames: ['testAction', 'handler'],
        });

        // Act
        const result = transformPass(program, context);

        // Assert
        const action = result.actions['testAction'];
        const step = action?.steps[0] as { event: string };
        expect(step.event).toBe(event);
      }
    });
  });

  // ==================== DisposeStep Transformation ====================

  describe('DisposeStep transformation', () => {
    it('should transform dispose step with target', () => {
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

      const context = createContext({ stateNames: ['editorInstance'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps[0]).toMatchObject({
        do: 'dispose',
        target: { expr: 'state', name: 'editorInstance' },
      });
    });

    it('should transform nested target expressions', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'dispose',
            target: {
              expr: 'get',
              base: { expr: 'state', name: 'resources' },
              path: 'subscription',
            },
          },
        ],
        { resources: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['resources'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        target: { expr: string; base: { expr: string }; path: string };
      };
      expect(step.target.expr).toBe('get');
      expect(step.target.base.expr).toBe('state');
      expect(step.target.path).toBe('subscription');
    });

    it('should transform dispose with var expression target', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'dispose',
          target: { expr: 'var', name: 'subscription' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        target: { expr: string; name: string };
      };
      expect(step.target.expr).toBe('var');
      expect(step.target.name).toBe('subscription');
    });

    it('should transform dispose with deeply nested get expression', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'dispose',
            target: {
              expr: 'get',
              base: {
                expr: 'get',
                base: { expr: 'state', name: 'app' },
                path: 'editors',
              },
              path: 'main.instance',
            },
          },
        ],
        { app: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['app'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        target: { expr: string; base: { expr: string; base: { expr: string } } };
      };
      expect(step.target.expr).toBe('get');
      expect(step.target.base.expr).toBe('get');
      expect(step.target.base.base.expr).toBe('state');
    });
  });

  // ==================== Integration Scenarios ====================

  describe('integration scenarios', () => {
    it('should transform complete Monaco Editor workflow', () => {
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
          },
        },
      } as unknown as Program;

      const context = createContext({
        stateNames: ['monacoLoaded', 'editorInstance', 'editorReady', 'code'],
        actionNames: ['initEditor', 'handleEditorChange', 'disposeEditor'],
        refNames: ['editorContainer'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      // Verify initEditor action
      const initEditor = result.actions['initEditor'];
      expect(initEditor?.steps.length).toBe(3);

      const importStep = initEditor?.steps[0] as { do: string; module: string };
      expect(importStep.do).toBe('import');
      expect(importStep.module).toBe('monaco-editor');

      const callStep = initEditor?.steps[1] as {
        do: string;
        args?: Array<{ expr: string }>;
      };
      expect(callStep.do).toBe('call');
      expect(callStep.args?.[0]?.expr).toBe('ref');

      const subscribeStep = initEditor?.steps[2] as { do: string; event: string };
      expect(subscribeStep.do).toBe('subscribe');
      expect(subscribeStep.event).toBe('onDidChangeModelContent');

      // Verify disposeEditor action
      const disposeEditor = result.actions['disposeEditor'];
      const disposeStep = disposeEditor?.steps[0] as { do: string };
      expect(disposeStep.do).toBe('dispose');

      // Verify view has ref
      const view = result.view as { ref?: string };
      expect(view.ref).toBe('editorContainer');
    });

    it('should transform Chart.js integration workflow', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          chartInstance: { type: 'object', initial: {} },
          chartData: { type: 'object', initial: { labels: [], datasets: [] } },
        },
        lifecycle: {
          onMount: 'initChart',
          onUnmount: 'destroyChart',
        },
        actions: [
          {
            name: 'initChart',
            steps: [
              {
                do: 'import',
                module: 'chart.js/auto',
                result: 'Chart',
                onSuccess: [
                  {
                    do: 'call',
                    target: { expr: 'var', name: 'Chart' },
                    args: [
                      { expr: 'ref', name: 'chartCanvas' },
                      {
                        expr: 'lit',
                        value: { type: 'bar' },
                      },
                    ],
                    result: 'chartInstance',
                  },
                ],
              },
            ],
          },
          {
            name: 'updateChart',
            steps: [
              {
                do: 'call',
                target: {
                  expr: 'get',
                  base: { expr: 'state', name: 'chartInstance' },
                  path: 'update',
                },
              },
            ],
          },
          {
            name: 'destroyChart',
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

      const context = createContext({
        stateNames: ['chartInstance', 'chartData'],
        actionNames: ['initChart', 'updateChart', 'destroyChart'],
        refNames: ['chartCanvas'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      // Verify import -> call chain in onSuccess
      const initChart = result.actions['initChart'];
      const importStepWithCallback = initChart?.steps[0] as {
        onSuccess?: Array<{ do: string; target: { expr: string } }>;
      };
      expect(importStepWithCallback.onSuccess?.[0]?.do).toBe('call');
      expect(importStepWithCallback.onSuccess?.[0]?.target.expr).toBe('var');

      // Verify view has ref
      const view = result.view as { ref?: string; tag: string };
      expect(view.tag).toBe('canvas');
      expect(view.ref).toBe('chartCanvas');
    });

    it('should transform Leaflet map integration workflow', () => {
      // Arrange
      const program: Program = {
        version: '1.0',
        state: {
          mapInstance: { type: 'object', initial: {} },
          markers: { type: 'list', initial: [] },
        },
        actions: [
          {
            name: 'initMap',
            steps: [
              {
                do: 'import',
                module: 'leaflet',
                result: 'L',
              },
              {
                do: 'call',
                target: { expr: 'var', name: 'L', path: 'map' },
                args: [
                  { expr: 'ref', name: 'mapContainer' },
                ],
                result: 'mapInstance',
              },
              {
                do: 'call',
                target: {
                  expr: 'get',
                  base: { expr: 'state', name: 'mapInstance' },
                  path: 'setView',
                },
                args: [
                  { expr: 'lit', value: [51.505, -0.09] },
                  { expr: 'lit', value: 13 },
                ],
              },
              {
                do: 'subscribe',
                target: { expr: 'state', name: 'mapInstance' },
                event: 'click',
                action: 'handleMapClick',
              },
            ],
          },
          {
            name: 'handleMapClick',
            steps: [],
          },
          {
            name: 'destroyMap',
            steps: [
              {
                do: 'dispose',
                target: { expr: 'state', name: 'mapInstance' },
              },
            ],
          },
        ],
        view: {
          kind: 'element',
          tag: 'div',
          ref: 'mapContainer',
          props: {
            style: { expr: 'lit', value: 'height: 400px' },
          },
        },
      } as unknown as Program;

      const context = createContext({
        stateNames: ['mapInstance', 'markers'],
        actionNames: ['initMap', 'handleMapClick', 'destroyMap'],
        refNames: ['mapContainer'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const initMap = result.actions['initMap'];
      expect(initMap?.steps.length).toBe(4);

      // Verify all step types are correctly transformed
      expect((initMap?.steps[0] as { do: string }).do).toBe('import');
      expect((initMap?.steps[1] as { do: string }).do).toBe('call');
      expect((initMap?.steps[2] as { do: string }).do).toBe('call');
      expect((initMap?.steps[3] as { do: string }).do).toBe('subscribe');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle import step without callbacks', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'import',
          module: 'simple-lib',
          result: 'lib',
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as {
        onSuccess?: unknown[];
        onError?: unknown[];
      };
      expect(step.onSuccess).toBeUndefined();
      expect(step.onError).toBeUndefined();
    });

    it('should handle call step without args', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'lib', path: 'noArgsFunc' },
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as { args?: unknown[] };
      expect(step.args).toBeUndefined();
    });

    it('should handle call step with empty args array', () => {
      // Arrange
      const program = createProgramWithAction([
        {
          do: 'call',
          target: { expr: 'var', name: 'lib', path: 'func' },
          args: [],
        },
      ]);

      const context = createContext();

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const step = action?.steps[0] as { args?: unknown[] };
      expect(step.args).toEqual([]);
    });

    it('should handle mixed step types in single action', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          { do: 'set', target: 'loading', value: { expr: 'lit', value: true } },
          {
            do: 'import',
            module: 'lib',
            result: 'lib',
          },
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'init' },
            args: [{ expr: 'ref', name: 'container' }],
          },
          {
            do: 'subscribe',
            target: { expr: 'var', name: 'lib' },
            event: 'ready',
            action: 'onReady',
          },
          { do: 'set', target: 'loading', value: { expr: 'lit', value: false } },
        ],
        { loading: { type: 'boolean', initial: false } },
        {
          view: {
            kind: 'element',
            tag: 'div',
            ref: 'container',
          },
        }
      );

      (program.actions as unknown[]).push({
        name: 'onReady',
        steps: [],
      });

      const context = createContext({
        stateNames: ['loading'],
        actionNames: ['testAction', 'onReady'],
        refNames: ['container'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      expect(action?.steps.length).toBe(5);
      expect((action?.steps[0] as { do: string }).do).toBe('set');
      expect((action?.steps[1] as { do: string }).do).toBe('import');
      expect((action?.steps[2] as { do: string }).do).toBe('call');
      expect((action?.steps[3] as { do: string }).do).toBe('subscribe');
      expect((action?.steps[4] as { do: string }).do).toBe('set');
    });

    it('should handle deeply nested callbacks in import/call steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'lib',
            result: 'lib',
            onSuccess: [
              {
                do: 'call',
                target: { expr: 'var', name: 'lib', path: 'init' },
                onSuccess: [
                  {
                    do: 'call',
                    target: { expr: 'var', name: 'lib', path: 'configure' },
                    onSuccess: [
                      { do: 'set', target: 'ready', value: { expr: 'lit', value: true } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        { ready: { type: 'boolean', initial: false } }
      );

      const context = createContext({ stateNames: ['ready'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];
      const importStep = action?.steps[0] as {
        onSuccess?: Array<{
          onSuccess?: Array<{
            onSuccess?: Array<{ do: string }>;
          }>;
        }>;
      };
      expect(importStep.onSuccess?.[0]?.onSuccess?.[0]?.onSuccess?.[0]?.do).toBe('set');
    });

    it('should preserve all properties in external library steps', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'monaco-editor',
            result: 'monaco',
            onSuccess: [
              { do: 'set', target: 'loaded', value: { expr: 'lit', value: true } },
            ],
            onError: [
              { do: 'set', target: 'error', value: { expr: 'lit', value: 'failed' } },
            ],
          },
          {
            do: 'call',
            target: { expr: 'var', name: 'monaco', path: 'editor.create' },
            args: [
              { expr: 'ref', name: 'container' },
              { expr: 'state', name: 'config' },
            ],
            result: 'editor',
            onSuccess: [
              { do: 'set', target: 'created', value: { expr: 'lit', value: true } },
            ],
            onError: [
              { do: 'set', target: 'createError', value: { expr: 'var', name: 'error' } },
            ],
          },
          {
            do: 'subscribe',
            target: { expr: 'var', name: 'editor' },
            event: 'onDidChangeModelContent',
            action: 'onChange',
          },
          {
            do: 'dispose',
            target: { expr: 'var', name: 'editor' },
          },
        ],
        {
          loaded: { type: 'boolean', initial: false },
          error: { type: 'string', initial: '' },
          config: { type: 'object', initial: {} },
          created: { type: 'boolean', initial: false },
          createError: { type: 'object', initial: {} },
        },
        {
          view: {
            kind: 'element',
            tag: 'div',
            ref: 'container',
          },
        }
      );

      (program.actions as unknown[]).push({
        name: 'onChange',
        steps: [],
      });

      const context = createContext({
        stateNames: ['loaded', 'error', 'config', 'created', 'createError'],
        actionNames: ['testAction', 'onChange'],
        refNames: ['container'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const action = result.actions['testAction'];

      // Import step
      const importStep = action?.steps[0] as {
        do: string;
        module: string;
        result: string;
        onSuccess?: unknown[];
        onError?: unknown[];
      };
      expect(importStep.do).toBe('import');
      expect(importStep.module).toBe('monaco-editor');
      expect(importStep.result).toBe('monaco');
      expect(importStep.onSuccess?.length).toBe(1);
      expect(importStep.onError?.length).toBe(1);

      // Call step
      const callStep = action?.steps[1] as {
        do: string;
        target: { expr: string };
        args?: unknown[];
        result?: string;
        onSuccess?: unknown[];
        onError?: unknown[];
      };
      expect(callStep.do).toBe('call');
      expect(callStep.target.expr).toBe('var');
      expect(callStep.args?.length).toBe(2);
      expect(callStep.result).toBe('editor');
      expect(callStep.onSuccess?.length).toBe(1);
      expect(callStep.onError?.length).toBe(1);

      // Subscribe step
      const subscribeStep = action?.steps[2] as {
        do: string;
        target: { expr: string };
        event: string;
        action: string;
      };
      expect(subscribeStep.do).toBe('subscribe');
      expect(subscribeStep.target.expr).toBe('var');
      expect(subscribeStep.event).toBe('onDidChangeModelContent');
      expect(subscribeStep.action).toBe('onChange');

      // Dispose step
      const disposeStep = action?.steps[3] as {
        do: string;
        target: { expr: string };
      };
      expect(disposeStep.do).toBe('dispose');
      expect(disposeStep.target.expr).toBe('var');
    });
  });

  // ==================== CompiledProgram Type Tests ====================

  describe('CompiledProgram type with external library steps', () => {
    it('should have correct CompiledImportStep structure', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'import',
            module: 'lib',
            result: 'lib',
            onSuccess: [
              { do: 'set', target: 'ok', value: { expr: 'lit', value: true } },
            ],
            onError: [
              { do: 'set', target: 'err', value: { expr: 'lit', value: 'fail' } },
            ],
          },
        ],
        {
          ok: { type: 'boolean', initial: false },
          err: { type: 'string', initial: '' },
        }
      );

      const context = createContext({ stateNames: ['ok', 'err'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0];
      expect(step).toMatchObject({
        do: 'import',
        module: 'lib',
        result: 'lib',
      });
    });

    it('should have correct CompiledCallStep structure', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'call',
            target: { expr: 'var', name: 'lib', path: 'func' },
            args: [{ expr: 'lit', value: 'arg1' }],
            result: 'retVal',
            onSuccess: [
              { do: 'set', target: 'ok', value: { expr: 'lit', value: true } },
            ],
            onError: [
              { do: 'set', target: 'err', value: { expr: 'lit', value: 'fail' } },
            ],
          },
        ],
        {
          ok: { type: 'boolean', initial: false },
          err: { type: 'string', initial: '' },
        }
      );

      const context = createContext({ stateNames: ['ok', 'err'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0];
      expect(step).toMatchObject({
        do: 'call',
        target: { expr: 'var', name: 'lib', path: 'func' },
        result: 'retVal',
      });
    });

    it('should have correct CompiledSubscribeStep structure', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'subscribe',
            target: { expr: 'state', name: 'instance' },
            event: 'onChange',
            action: 'handler',
          },
        ],
        { instance: { type: 'object', initial: {} } }
      );

      (program.actions as unknown[]).push({
        name: 'handler',
        steps: [],
      });

      const context = createContext({
        stateNames: ['instance'],
        actionNames: ['testAction', 'handler'],
      });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0];
      expect(step).toMatchObject({
        do: 'subscribe',
        target: { expr: 'state', name: 'instance' },
        event: 'onChange',
        action: 'handler',
      });
    });

    it('should have correct CompiledDisposeStep structure', () => {
      // Arrange
      const program = createProgramWithAction(
        [
          {
            do: 'dispose',
            target: { expr: 'state', name: 'resource' },
          },
        ],
        { resource: { type: 'object', initial: {} } }
      );

      const context = createContext({ stateNames: ['resource'] });

      // Act
      const result = transformPass(program, context);

      // Assert
      const step = result.actions['testAction']?.steps[0];
      expect(step).toMatchObject({
        do: 'dispose',
        target: { expr: 'state', name: 'resource' },
      });
    });
  });
});
