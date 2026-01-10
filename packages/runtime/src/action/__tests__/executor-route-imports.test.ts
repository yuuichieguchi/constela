/**
 * Test module for ActionContext route and imports support.
 *
 * Coverage:
 * - ActionContext should support route property
 * - ActionContext should support imports property
 * - Route expressions should be evaluated correctly in set/update steps
 * - Import expressions should be evaluated correctly in set/update steps
 * - Route and imports should work in if conditions
 *
 * TDD Red Phase: These tests verify that route and imports properties
 * are properly passed to the evaluation context when executing action steps.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';

describe('executeAction with Route and Imports context', () => {
  // ==================== Setup ====================

  beforeEach(() => {
    // No special setup needed
  });

  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }>,
    options: {
      actions?: Record<string, CompiledAction>;
      locals?: Record<string, unknown>;
      route?: {
        params: Record<string, string>;
        query: Record<string, string>;
        path: string;
      };
      imports?: Record<string, unknown>;
    } = {}
  ): ActionContext {
    return {
      state: createStateStore(stateDefinitions),
      actions: options.actions ?? {},
      locals: options.locals ?? {},
      route: options.route,
      imports: options.imports,
    };
  }

  // ==================== ActionContext interface tests ====================

  describe('ActionContext interface', () => {
    it('should accept route property in ActionContext', () => {
      // Arrange
      const route = {
        params: { id: '123' },
        query: { page: '1' },
        path: '/users/123',
      };

      // Act
      const context = createContext({}, { route });

      // Assert
      expect(context.route).toBeDefined();
      expect(context.route?.params.id).toBe('123');
      expect(context.route?.query.page).toBe('1');
      expect(context.route?.path).toBe('/users/123');
    });

    it('should accept imports property in ActionContext', () => {
      // Arrange
      const imports = {
        codeStrings: {
          examples: ['const a = 1;', 'const b = 2;'],
        },
        config: {
          theme: 'dark',
        },
      };

      // Act
      const context = createContext({}, { imports });

      // Assert
      expect(context.imports).toBeDefined();
      expect(context.imports?.codeStrings).toBeDefined();
      expect(context.imports?.config).toBeDefined();
    });
  });

  // ==================== Route expression in set step ====================

  describe('route expression in set step', () => {
    it('should evaluate route param expression in set step value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromRouteParam',
        steps: [
          {
            do: 'set',
            target: 'userId',
            value: { expr: 'route', name: 'id', source: 'param' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { userId: { type: 'string', initial: '' } },
        {
          route: {
            params: { id: '42' },
            query: {},
            path: '/users/42',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('userId')).toBe('42');
    });

    it('should evaluate route query expression in set step value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromRouteQuery',
        steps: [
          {
            do: 'set',
            target: 'currentPage',
            value: { expr: 'route', name: 'page', source: 'query' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { currentPage: { type: 'string', initial: '1' } },
        {
          route: {
            params: {},
            query: { page: '5', limit: '20' },
            path: '/items',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('currentPage')).toBe('5');
    });

    it('should evaluate route path expression in set step value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromRoutePath',
        steps: [
          {
            do: 'set',
            target: 'currentPath',
            value: { expr: 'route', name: 'path', source: 'path' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { currentPath: { type: 'string', initial: '' } },
        {
          route: {
            params: {},
            query: {},
            path: '/blog/my-article-slug',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('currentPath')).toBe('/blog/my-article-slug');
    });

    it('should evaluate route in binary expression with state', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromRouteWithPrefix',
        steps: [
          {
            do: 'set',
            target: 'fullId',
            value: {
              expr: 'bin',
              op: '+',
              left: { expr: 'state', name: 'prefix' },
              right: { expr: 'route', name: 'id', source: 'param' },
            },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        {
          prefix: { type: 'string', initial: 'USER-' },
          fullId: { type: 'string', initial: '' },
        },
        {
          route: {
            params: { id: '123' },
            query: {},
            path: '/users/123',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('fullId')).toBe('USER-123');
    });
  });

  // ==================== Import expression in set step ====================

  describe('import expression in set step', () => {
    it('should evaluate import expression in set step value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromImport',
        steps: [
          {
            do: 'set',
            target: 'theme',
            value: { expr: 'import', name: 'config', path: 'theme' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { theme: { type: 'string', initial: 'light' } },
        {
          imports: {
            config: {
              theme: 'dark',
              language: 'en',
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('theme')).toBe('dark');
    });

    it('should evaluate import expression without path for entire object', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromImportObject',
        steps: [
          {
            do: 'set',
            target: 'settings',
            value: { expr: 'import', name: 'config' },
          } as CompiledActionStep,
        ],
      };

      const configData = { theme: 'dark', language: 'en' };
      const context = createContext(
        { settings: { type: 'object', initial: {} } },
        {
          imports: {
            config: configData,
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('settings')).toEqual(configData);
    });

    it('should evaluate import expression with nested path', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromNestedImport',
        steps: [
          {
            do: 'set',
            target: 'firstExample',
            value: { expr: 'import', name: 'codeStrings', path: 'examples.0' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { firstExample: { type: 'string', initial: '' } },
        {
          imports: {
            codeStrings: {
              examples: ['const a = 1;', 'const b = 2;', 'const c = 3;'],
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('firstExample')).toBe('const a = 1;');
    });

    it('should evaluate import in binary expression', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setFromImportWithSuffix',
        steps: [
          {
            do: 'set',
            target: 'greeting',
            value: {
              expr: 'bin',
              op: '+',
              left: { expr: 'import', name: 'strings', path: 'hello' },
              right: { expr: 'lit', value: ', World!' },
            },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { greeting: { type: 'string', initial: '' } },
        {
          imports: {
            strings: {
              hello: 'Hello',
              goodbye: 'Goodbye',
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('greeting')).toBe('Hello, World!');
    });
  });

  // ==================== Route and imports in update step ====================

  describe('route and imports in update step', () => {
    it('should evaluate route expression in update step value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'pushRouteValue',
        steps: [
          {
            do: 'update',
            target: 'visitedIds',
            operation: 'push',
            value: { expr: 'route', name: 'id', source: 'param' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { visitedIds: { type: 'array', initial: ['1', '2'] } },
        {
          route: {
            params: { id: '3' },
            query: {},
            path: '/items/3',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('visitedIds')).toEqual(['1', '2', '3']);
    });

    it('should evaluate import expression in update step value', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'mergeImportConfig',
        steps: [
          {
            do: 'update',
            target: 'settings',
            operation: 'merge',
            value: { expr: 'import', name: 'defaultSettings' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { settings: { type: 'object', initial: { custom: true } } },
        {
          imports: {
            defaultSettings: {
              theme: 'dark',
              fontSize: 14,
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('settings')).toEqual({
        custom: true,
        theme: 'dark',
        fontSize: 14,
      });
    });
  });

  // ==================== Route and imports in if condition ====================

  describe('route and imports in if condition', () => {
    it('should evaluate route expression in if condition', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'conditionalByRoute',
        steps: [
          {
            do: 'if',
            condition: {
              expr: 'bin',
              op: '==',
              left: { expr: 'route', name: 'id', source: 'param' },
              right: { expr: 'lit', value: 'admin' },
            },
            then: [
              { do: 'set', target: 'isAdmin', value: { expr: 'lit', value: true } },
            ],
            else: [
              { do: 'set', target: 'isAdmin', value: { expr: 'lit', value: false } },
            ],
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { isAdmin: { type: 'boolean', initial: false } },
        {
          route: {
            params: { id: 'admin' },
            query: {},
            path: '/users/admin',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('isAdmin')).toBe(true);
    });

    it('should evaluate import expression in if condition', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'conditionalByImport',
        steps: [
          {
            do: 'if',
            condition: { expr: 'import', name: 'config', path: 'featureEnabled' },
            then: [
              { do: 'set', target: 'showFeature', value: { expr: 'lit', value: true } },
            ],
            else: [
              { do: 'set', target: 'showFeature', value: { expr: 'lit', value: false } },
            ],
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { showFeature: { type: 'boolean', initial: false } },
        {
          imports: {
            config: {
              featureEnabled: true,
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('showFeature')).toBe(true);
    });

    it('should evaluate route and import together in complex condition', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'complexCondition',
        steps: [
          {
            do: 'if',
            condition: {
              expr: 'bin',
              op: '&&',
              left: { expr: 'import', name: 'config', path: 'enabledUserIds' },
              right: {
                expr: 'bin',
                op: '==',
                left: { expr: 'route', name: 'role', source: 'param' },
                right: { expr: 'lit', value: 'admin' },
              },
            },
            then: [
              { do: 'set', target: 'hasAccess', value: { expr: 'lit', value: true } },
            ],
            else: [
              { do: 'set', target: 'hasAccess', value: { expr: 'lit', value: false } },
            ],
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { hasAccess: { type: 'boolean', initial: false } },
        {
          route: {
            params: { role: 'admin' },
            query: {},
            path: '/admin',
          },
          imports: {
            config: {
              enabledUserIds: ['1', '2', '3'],
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('hasAccess')).toBe(true);
    });
  });

  // ==================== Route and imports in nested set within then/else ====================

  describe('route and imports in nested steps', () => {
    it('should evaluate route in set step inside if then block', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'nestedRouteSet',
        steps: [
          {
            do: 'if',
            condition: { expr: 'lit', value: true },
            then: [
              {
                do: 'set',
                target: 'capturedId',
                value: { expr: 'route', name: 'id', source: 'param' },
              },
            ],
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { capturedId: { type: 'string', initial: '' } },
        {
          route: {
            params: { id: '999' },
            query: {},
            path: '/test/999',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('capturedId')).toBe('999');
    });

    it('should evaluate import in set step inside if else block', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'nestedImportSet',
        steps: [
          {
            do: 'if',
            condition: { expr: 'lit', value: false },
            then: [
              {
                do: 'set',
                target: 'value',
                value: { expr: 'lit', value: 'then' },
              },
            ],
            else: [
              {
                do: 'set',
                target: 'value',
                value: { expr: 'import', name: 'defaults', path: 'fallback' },
              },
            ],
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { value: { type: 'string', initial: '' } },
        {
          imports: {
            defaults: {
              fallback: 'default-value',
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('value')).toBe('default-value');
    });
  });

  // ==================== Missing route/imports graceful handling ====================

  describe('missing route/imports handling', () => {
    it('should handle missing route gracefully (return empty string)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setWithoutRoute',
        steps: [
          {
            do: 'set',
            target: 'result',
            value: { expr: 'route', name: 'id', source: 'param' },
          } as CompiledActionStep,
        ],
      };

      // Note: no route provided in context
      const context = createContext({ result: { type: 'string', initial: 'initial' } });

      // Act
      await executeAction(action, context);

      // Assert - should get empty string when route is missing
      expect(context.state.get('result')).toBe('');
    });

    it('should handle missing imports gracefully (return undefined)', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setWithoutImports',
        steps: [
          {
            do: 'set',
            target: 'result',
            value: { expr: 'import', name: 'config', path: 'theme' },
          } as CompiledActionStep,
        ],
      };

      // Note: no imports provided in context
      const context = createContext({ result: { type: 'string', initial: 'initial' } });

      // Act
      await executeAction(action, context);

      // Assert - should get undefined when imports is missing
      expect(context.state.get('result')).toBeUndefined();
    });
  });

  // ==================== Edge cases ====================

  describe('edge cases', () => {
    it('should handle empty route params', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setEmptyParam',
        steps: [
          {
            do: 'set',
            target: 'result',
            value: { expr: 'route', name: 'optional', source: 'param' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { result: { type: 'string', initial: 'initial' } },
        {
          route: {
            params: { optional: '' },
            query: {},
            path: '/test',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('result')).toBe('');
    });

    it('should handle missing param name in route', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setMissingParam',
        steps: [
          {
            do: 'set',
            target: 'result',
            value: { expr: 'route', name: 'nonexistent', source: 'param' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { result: { type: 'string', initial: 'initial' } },
        {
          route: {
            params: { id: '123' },
            query: {},
            path: '/test',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert - should get empty string for missing param
      expect(context.state.get('result')).toBe('');
    });

    it('should handle deeply nested import path', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'setDeepImport',
        steps: [
          {
            do: 'set',
            target: 'result',
            value: { expr: 'import', name: 'data', path: 'level1.level2.level3.value' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { result: { type: 'string', initial: '' } },
        {
          imports: {
            data: {
              level1: {
                level2: {
                  level3: {
                    value: 'deep-value',
                  },
                },
              },
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('result')).toBe('deep-value');
    });

    it('should handle synchronous set step with route', async () => {
      // Arrange - using synchronous set step execution path
      const action: CompiledAction = {
        name: 'syncSetWithRoute',
        steps: [
          {
            do: 'set',
            target: 'value1',
            value: { expr: 'route', name: 'a', source: 'param' },
          } as CompiledActionStep,
          {
            do: 'set',
            target: 'value2',
            value: { expr: 'route', name: 'b', source: 'query' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        {
          value1: { type: 'string', initial: '' },
          value2: { type: 'string', initial: '' },
        },
        {
          route: {
            params: { a: 'param-value' },
            query: { b: 'query-value' },
            path: '/test',
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('value1')).toBe('param-value');
      expect(context.state.get('value2')).toBe('query-value');
    });

    it('should handle synchronous update step with imports', async () => {
      // Arrange - using synchronous update step execution path
      const action: CompiledAction = {
        name: 'syncUpdateWithImports',
        steps: [
          {
            do: 'update',
            target: 'counter',
            operation: 'increment',
            value: { expr: 'import', name: 'config', path: 'incrementBy' },
          } as CompiledActionStep,
        ],
      };

      const context = createContext(
        { counter: { type: 'number', initial: 0 } },
        {
          imports: {
            config: {
              incrementBy: 5,
            },
          },
        }
      );

      // Act
      await executeAction(action, context);

      // Assert
      expect(context.state.get('counter')).toBe(5);
    });
  });
});
