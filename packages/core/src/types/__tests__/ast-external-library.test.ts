/**
 * Test module for External Library Integration types.
 *
 * Coverage:
 * - RefExpr type structure and type guard
 * - ImportStep type structure and type guard
 * - CallStep type structure and type guard
 * - SubscribeStep type structure and type guard
 * - DisposeStep type structure and type guard
 * - ElementNode.ref optional property
 * - Expression union includes RefExpr
 * - ActionStep union includes new step types
 *
 * TDD Red Phase: These tests verify the external library integration types
 * that will be added to support dynamic imports, external function calls,
 * event subscriptions, and resource cleanup in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type {
  RefExpr,
  ImportStep,
  CallStep,
  SubscribeStep,
  DisposeStep,
  Expression,
  ActionStep,
  ElementNode,
} from '../ast.js';
import {
  isRefExpr,
  isImportStep,
  isCallStep,
  isSubscribeStep,
  isDisposeStep,
  isExpression,
  isActionStep,
  isElementNode,
} from '../guards.js';

// ==================== RefExpr Tests ====================

describe('RefExpr', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have expr field set to "ref"', () => {
      // Arrange
      const refExpr = {
        expr: 'ref',
        name: 'editorContainer',
      };

      // Assert
      expect(isRefExpr(refExpr)).toBe(true);
    });

    it('should require name field as string', () => {
      // Arrange
      const validRefExpr = {
        expr: 'ref',
        name: 'canvas',
      };

      const invalidRefExpr = {
        expr: 'ref',
        name: 123, // Invalid: should be string
      };

      // Assert
      expect(isRefExpr(validRefExpr)).toBe(true);
      expect(isRefExpr(invalidRefExpr)).toBe(false);
    });

    it('should accept various ref names', () => {
      // Arrange
      const refNames = [
        { expr: 'ref', name: 'editorContainer' },
        { expr: 'ref', name: 'videoPlayer' },
        { expr: 'ref', name: 'chartCanvas' },
        { expr: 'ref', name: 'mapContainer' },
        { expr: 'ref', name: 'terminalElement' },
      ];

      // Assert
      for (const ref of refNames) {
        expect(isRefExpr(ref)).toBe(true);
      }
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isRefExpr(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isRefExpr(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isRefExpr({})).toBe(false);
    });

    it('should reject array', () => {
      expect(isRefExpr([])).toBe(false);
    });

    it('should reject object without expr field', () => {
      const obj = { name: 'editor' };
      expect(isRefExpr(obj)).toBe(false);
    });

    it('should reject object with wrong expr value', () => {
      const obj = { expr: 'var', name: 'editor' };
      expect(isRefExpr(obj)).toBe(false);
    });

    it('should reject object without name field', () => {
      const obj = { expr: 'ref' };
      expect(isRefExpr(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isRefExpr('ref')).toBe(false);
      expect(isRefExpr(123)).toBe(false);
      expect(isRefExpr(true)).toBe(false);
    });

    it('should allow empty string name (semantic validation done elsewhere)', () => {
      const obj = { expr: 'ref', name: '' };
      expect(isRefExpr(obj)).toBe(true);
    });
  });
});

// ==================== ImportStep Tests ====================

describe('ImportStep', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have do field set to "import"', () => {
      // Arrange
      const step = {
        do: 'import',
        module: 'monaco-editor',
        result: 'monaco',
      };

      // Assert
      expect(isImportStep(step)).toBe(true);
    });

    it('should require module field as string', () => {
      // Arrange
      const validStep = {
        do: 'import',
        module: '@codemirror/state',
        result: 'codemirror',
      };

      const invalidStep = {
        do: 'import',
        module: 123, // Invalid: should be string
        result: 'mod',
      };

      // Assert
      expect(isImportStep(validStep)).toBe(true);
      expect(isImportStep(invalidStep)).toBe(false);
    });

    it('should require result field as string', () => {
      // Arrange
      const validStep = {
        do: 'import',
        module: 'three',
        result: 'THREE',
      };

      const invalidStep = {
        do: 'import',
        module: 'three',
        result: 123, // Invalid: should be string
      };

      const missingResultStep = {
        do: 'import',
        module: 'three',
        // Missing result field
      };

      // Assert
      expect(isImportStep(validStep)).toBe(true);
      expect(isImportStep(invalidStep)).toBe(false);
      expect(isImportStep(missingResultStep)).toBe(false);
    });

    it('should accept optional onSuccess callback', () => {
      // Arrange
      const stepWithOnSuccess = {
        do: 'import',
        module: 'monaco-editor',
        result: 'monaco',
        onSuccess: [
          { do: 'set', target: 'editorLoaded', value: { expr: 'lit', value: true } },
        ],
      };

      // Assert
      expect(isImportStep(stepWithOnSuccess)).toBe(true);
    });

    it('should accept optional onError callback', () => {
      // Arrange
      const stepWithOnError = {
        do: 'import',
        module: 'monaco-editor',
        result: 'monaco',
        onError: [
          { do: 'set', target: 'loadError', value: { expr: 'lit', value: 'Failed to load editor' } },
        ],
      };

      // Assert
      expect(isImportStep(stepWithOnError)).toBe(true);
    });

    it('should accept both onSuccess and onError callbacks', () => {
      // Arrange
      const stepWithBothCallbacks = {
        do: 'import',
        module: 'monaco-editor',
        result: 'monaco',
        onSuccess: [
          { do: 'set', target: 'editorLoaded', value: { expr: 'lit', value: true } },
        ],
        onError: [
          { do: 'set', target: 'loadError', value: { expr: 'var', name: 'error', path: 'message' } },
        ],
      };

      // Assert
      expect(isImportStep(stepWithBothCallbacks)).toBe(true);
    });

    it('should accept various module names', () => {
      // Arrange
      const modules = [
        { do: 'import', module: 'monaco-editor', result: 'monaco' },
        { do: 'import', module: '@codemirror/state', result: 'state' },
        { do: 'import', module: 'three', result: 'THREE' },
        { do: 'import', module: 'chart.js', result: 'Chart' },
        { do: 'import', module: 'leaflet', result: 'L' },
        { do: 'import', module: '@xterm/xterm', result: 'Terminal' },
      ];

      // Assert
      for (const step of modules) {
        expect(isImportStep(step)).toBe(true);
      }
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isImportStep(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isImportStep(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isImportStep({})).toBe(false);
    });

    it('should reject object with wrong do field', () => {
      const obj = {
        do: 'fetch',
        url: { expr: 'lit', value: 'https://example.com' },
      };
      expect(isImportStep(obj)).toBe(false);
    });

    it('should reject object without module field', () => {
      const obj = {
        do: 'import',
        result: 'monaco',
      };
      expect(isImportStep(obj)).toBe(false);
    });

    it('should reject object without result field', () => {
      const obj = {
        do: 'import',
        module: 'monaco-editor',
      };
      expect(isImportStep(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isImportStep('import')).toBe(false);
      expect(isImportStep(123)).toBe(false);
      expect(isImportStep(true)).toBe(false);
    });
  });
});

// ==================== CallStep Tests ====================

describe('CallStep', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have do field set to "call"', () => {
      // Arrange
      const step = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
      };

      // Assert
      expect(isCallStep(step)).toBe(true);
    });

    it('should require target field as Expression', () => {
      // Arrange
      const validStep = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
      };

      const invalidStep = {
        do: 'call',
        target: 'monaco.editor.create', // Invalid: should be Expression
      };

      const missingTargetStep = {
        do: 'call',
        // Missing target field
      };

      // Assert
      expect(isCallStep(validStep)).toBe(true);
      expect(isCallStep(invalidStep)).toBe(false);
      expect(isCallStep(missingTargetStep)).toBe(false);
    });

    it('should accept optional args field as Expression array', () => {
      // Arrange
      const stepWithArgs = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        args: [
          { expr: 'ref', name: 'editorContainer' },
          { expr: 'lit', value: { language: 'typescript', theme: 'vs-dark' } },
        ],
      };

      // Assert
      expect(isCallStep(stepWithArgs)).toBe(true);
    });

    it('should accept empty args array', () => {
      // Arrange
      const stepWithEmptyArgs = {
        do: 'call',
        target: { expr: 'var', name: 'editor', path: 'dispose' },
        args: [],
      };

      // Assert
      expect(isCallStep(stepWithEmptyArgs)).toBe(true);
    });

    it('should accept optional result field for storing return value', () => {
      // Arrange
      const stepWithResult = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        args: [
          { expr: 'ref', name: 'editorContainer' },
        ],
        result: 'editorInstance',
      };

      // Assert
      expect(isCallStep(stepWithResult)).toBe(true);
    });

    it('should accept optional onSuccess callback', () => {
      // Arrange
      const stepWithOnSuccess = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        args: [{ expr: 'ref', name: 'container' }],
        result: 'editor',
        onSuccess: [
          { do: 'set', target: 'editorReady', value: { expr: 'lit', value: true } },
        ],
      };

      // Assert
      expect(isCallStep(stepWithOnSuccess)).toBe(true);
    });

    it('should accept optional onError callback', () => {
      // Arrange
      const stepWithOnError = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        onError: [
          { do: 'set', target: 'error', value: { expr: 'var', name: 'error', path: 'message' } },
        ],
      };

      // Assert
      expect(isCallStep(stepWithOnError)).toBe(true);
    });

    it('should accept all optional fields together', () => {
      // Arrange
      const fullStep = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        args: [
          { expr: 'ref', name: 'editorContainer' },
          { expr: 'lit', value: { language: 'javascript' } },
        ],
        result: 'editorInstance',
        onSuccess: [
          { do: 'set', target: 'ready', value: { expr: 'lit', value: true } },
        ],
        onError: [
          { do: 'set', target: 'error', value: { expr: 'var', name: 'error' } },
        ],
      };

      // Assert
      expect(isCallStep(fullStep)).toBe(true);
    });

    it('should accept target with various expression types', () => {
      // Arrange
      const targets = [
        // VarExpr with path
        { do: 'call', target: { expr: 'var', name: 'monaco', path: 'editor.create' } },
        // StateExpr
        { do: 'call', target: { expr: 'state', name: 'editorInstance' } },
        // GetExpr
        { do: 'call', target: { expr: 'get', base: { expr: 'var', name: 'obj' }, path: 'method' } },
      ];

      // Assert
      for (const step of targets) {
        expect(isCallStep(step)).toBe(true);
      }
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isCallStep(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isCallStep(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isCallStep({})).toBe(false);
    });

    it('should reject object with wrong do field', () => {
      const obj = {
        do: 'fetch',
        url: { expr: 'lit', value: 'https://example.com' },
      };
      expect(isCallStep(obj)).toBe(false);
    });

    it('should reject object without target field', () => {
      const obj = {
        do: 'call',
        args: [{ expr: 'lit', value: 'arg' }],
      };
      expect(isCallStep(obj)).toBe(false);
    });

    it('should reject target that is not an Expression', () => {
      const obj = {
        do: 'call',
        target: 'monaco.editor.create', // Should be Expression object
      };
      expect(isCallStep(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isCallStep('call')).toBe(false);
      expect(isCallStep(123)).toBe(false);
      expect(isCallStep(true)).toBe(false);
    });
  });
});

// ==================== SubscribeStep Tests ====================

describe('SubscribeStep', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have do field set to "subscribe"', () => {
      // Arrange
      const step = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editorInstance' },
        event: 'onDidChangeModelContent',
        action: 'handleEditorChange',
      };

      // Assert
      expect(isSubscribeStep(step)).toBe(true);
    });

    it('should require target field as Expression', () => {
      // Arrange
      const validStep = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        event: 'onDidChangeModelContent',
        action: 'handleChange',
      };

      const invalidStep = {
        do: 'subscribe',
        target: 'editor', // Invalid: should be Expression
        event: 'onDidChangeModelContent',
        action: 'handleChange',
      };

      // Assert
      expect(isSubscribeStep(validStep)).toBe(true);
      expect(isSubscribeStep(invalidStep)).toBe(false);
    });

    it('should require event field as string', () => {
      // Arrange
      const validStep = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        event: 'onDidChangeModelContent',
        action: 'handleChange',
      };

      const invalidStep = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        event: 123, // Invalid: should be string
        action: 'handleChange',
      };

      // Assert
      expect(isSubscribeStep(validStep)).toBe(true);
      expect(isSubscribeStep(invalidStep)).toBe(false);
    });

    it('should require action field as string', () => {
      // Arrange
      const validStep = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        event: 'onDidChangeModelContent',
        action: 'handleEditorChange',
      };

      const invalidStep = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        event: 'onDidChangeModelContent',
        action: { name: 'handleChange' }, // Invalid: should be string
      };

      // Assert
      expect(isSubscribeStep(validStep)).toBe(true);
      expect(isSubscribeStep(invalidStep)).toBe(false);
    });

    it('should accept various event names', () => {
      // Arrange
      const events = [
        { do: 'subscribe', target: { expr: 'state', name: 'editor' }, event: 'onDidChangeModelContent', action: 'a' },
        { do: 'subscribe', target: { expr: 'state', name: 'editor' }, event: 'onDidChangeCursorPosition', action: 'b' },
        { do: 'subscribe', target: { expr: 'state', name: 'chart' }, event: 'onClick', action: 'c' },
        { do: 'subscribe', target: { expr: 'state', name: 'map' }, event: 'onZoomEnd', action: 'd' },
        { do: 'subscribe', target: { expr: 'state', name: 'terminal' }, event: 'onData', action: 'e' },
      ];

      // Assert
      for (const step of events) {
        expect(isSubscribeStep(step)).toBe(true);
      }
    });

    it('should accept target from various expression types', () => {
      // Arrange
      const targets = [
        // StateExpr
        { do: 'subscribe', target: { expr: 'state', name: 'editorInstance' }, event: 'ev', action: 'act' },
        // VarExpr
        { do: 'subscribe', target: { expr: 'var', name: 'editor' }, event: 'ev', action: 'act' },
        // GetExpr
        { do: 'subscribe', target: { expr: 'get', base: { expr: 'state', name: 'obj' }, path: 'editor' }, event: 'ev', action: 'act' },
      ];

      // Assert
      for (const step of targets) {
        expect(isSubscribeStep(step)).toBe(true);
      }
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isSubscribeStep(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isSubscribeStep(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isSubscribeStep({})).toBe(false);
    });

    it('should reject object with wrong do field', () => {
      const obj = {
        do: 'fetch',
        url: { expr: 'lit', value: 'https://example.com' },
      };
      expect(isSubscribeStep(obj)).toBe(false);
    });

    it('should reject object without target field', () => {
      const obj = {
        do: 'subscribe',
        event: 'onClick',
        action: 'handleClick',
      };
      expect(isSubscribeStep(obj)).toBe(false);
    });

    it('should reject object without event field', () => {
      const obj = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        action: 'handleChange',
      };
      expect(isSubscribeStep(obj)).toBe(false);
    });

    it('should reject object without action field', () => {
      const obj = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        event: 'onDidChangeModelContent',
      };
      expect(isSubscribeStep(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isSubscribeStep('subscribe')).toBe(false);
      expect(isSubscribeStep(123)).toBe(false);
      expect(isSubscribeStep(true)).toBe(false);
    });
  });
});

// ==================== DisposeStep Tests ====================

describe('DisposeStep', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have do field set to "dispose"', () => {
      // Arrange
      const step = {
        do: 'dispose',
        target: { expr: 'state', name: 'editorInstance' },
      };

      // Assert
      expect(isDisposeStep(step)).toBe(true);
    });

    it('should require target field as Expression', () => {
      // Arrange
      const validStep = {
        do: 'dispose',
        target: { expr: 'state', name: 'editor' },
      };

      const invalidStep = {
        do: 'dispose',
        target: 'editor', // Invalid: should be Expression
      };

      const missingTargetStep = {
        do: 'dispose',
        // Missing target field
      };

      // Assert
      expect(isDisposeStep(validStep)).toBe(true);
      expect(isDisposeStep(invalidStep)).toBe(false);
      expect(isDisposeStep(missingTargetStep)).toBe(false);
    });

    it('should accept target from various expression types', () => {
      // Arrange
      const targets = [
        // StateExpr
        { do: 'dispose', target: { expr: 'state', name: 'editorInstance' } },
        // VarExpr
        { do: 'dispose', target: { expr: 'var', name: 'subscription' } },
        // GetExpr
        { do: 'dispose', target: { expr: 'get', base: { expr: 'state', name: 'resources' }, path: 'editor' } },
      ];

      // Assert
      for (const step of targets) {
        expect(isDisposeStep(step)).toBe(true);
      }
    });

    it('should work with common disposable resources', () => {
      // Arrange - Common use cases
      const disposables = [
        { do: 'dispose', target: { expr: 'state', name: 'editorInstance' } },
        { do: 'dispose', target: { expr: 'state', name: 'chartInstance' } },
        { do: 'dispose', target: { expr: 'state', name: 'mapInstance' } },
        { do: 'dispose', target: { expr: 'state', name: 'terminalInstance' } },
        { do: 'dispose', target: { expr: 'state', name: 'eventSubscription' } },
      ];

      // Assert
      for (const step of disposables) {
        expect(isDisposeStep(step)).toBe(true);
      }
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isDisposeStep(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isDisposeStep(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isDisposeStep({})).toBe(false);
    });

    it('should reject object with wrong do field', () => {
      const obj = {
        do: 'set',
        target: 'counter',
        value: { expr: 'lit', value: 0 },
      };
      expect(isDisposeStep(obj)).toBe(false);
    });

    it('should reject object without target field', () => {
      const obj = {
        do: 'dispose',
      };
      expect(isDisposeStep(obj)).toBe(false);
    });

    it('should reject target that is not an Expression', () => {
      const obj = {
        do: 'dispose',
        target: 'editorInstance', // Should be Expression object
      };
      expect(isDisposeStep(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isDisposeStep('dispose')).toBe(false);
      expect(isDisposeStep(123)).toBe(false);
      expect(isDisposeStep(true)).toBe(false);
    });
  });
});

// ==================== ElementNode.ref Tests ====================

describe('ElementNode with ref property', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should accept ElementNode with ref property', () => {
      // Arrange
      const element = {
        kind: 'element',
        tag: 'div',
        ref: 'editorContainer',
      };

      // Assert
      expect(isElementNode(element)).toBe(true);
    });

    it('should accept ElementNode without ref property (optional)', () => {
      // Arrange
      const element = {
        kind: 'element',
        tag: 'div',
      };

      // Assert
      expect(isElementNode(element)).toBe(true);
    });

    it('should accept ref as string only', () => {
      // Arrange
      const validElement = {
        kind: 'element',
        tag: 'div',
        ref: 'container',
      };

      // Assert
      expect(isElementNode(validElement)).toBe(true);
    });

    it('should accept ElementNode with ref and other properties', () => {
      // Arrange
      const element = {
        kind: 'element',
        tag: 'div',
        ref: 'editorContainer',
        props: {
          className: { expr: 'lit', value: 'editor-wrapper' },
        },
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
        ],
      };

      // Assert
      expect(isElementNode(element)).toBe(true);
    });

    it('should accept various ref names for different use cases', () => {
      // Arrange
      const elements = [
        { kind: 'element', tag: 'div', ref: 'monacoContainer' },
        { kind: 'element', tag: 'canvas', ref: 'chartCanvas' },
        { kind: 'element', tag: 'div', ref: 'mapContainer' },
        { kind: 'element', tag: 'div', ref: 'terminalElement' },
        { kind: 'element', tag: 'video', ref: 'videoPlayer' },
      ];

      // Assert
      for (const element of elements) {
        expect(isElementNode(element)).toBe(true);
      }
    });
  });

  // ==================== TypeScript Type Compatibility ====================

  describe('TypeScript type compatibility', () => {
    it('should allow assigning ref string to ElementNode.ref', () => {
      // Arrange
      const element: ElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'container',
      };

      // Assert
      expect(element.ref).toBe('container');
    });

    it('should allow undefined ref in ElementNode', () => {
      // Arrange
      const element: ElementNode = {
        kind: 'element',
        tag: 'div',
      };

      // Assert
      expect(element.ref).toBeUndefined();
    });
  });
});

// ==================== Expression Union Tests ====================

describe('Expression union with RefExpr', () => {
  it('should recognize RefExpr as valid Expression', () => {
    // Arrange
    const refExpr = {
      expr: 'ref',
      name: 'editorContainer',
    };

    // Assert
    expect(isExpression(refExpr)).toBe(true);
  });

  it('should recognize RefExpr among other expression types', () => {
    // Arrange
    const expressions = [
      { expr: 'ref', name: 'container' },
      { expr: 'lit', value: 'hello' },
      { expr: 'state', name: 'counter' },
      { expr: 'var', name: 'item' },
    ];

    // Assert
    for (const expr of expressions) {
      expect(isExpression(expr)).toBe(true);
    }
  });
});

// ==================== ActionStep Union Tests ====================

describe('ActionStep union with external library steps', () => {
  // ==================== ActionStep Union ====================

  describe('isActionStep includes external library step types', () => {
    it('should recognize ImportStep as valid ActionStep', () => {
      // Arrange
      const importStep = {
        do: 'import',
        module: 'monaco-editor',
        result: 'monaco',
      };

      // Assert
      expect(isActionStep(importStep)).toBe(true);
    });

    it('should recognize CallStep as valid ActionStep', () => {
      // Arrange
      const callStep = {
        do: 'call',
        target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        args: [{ expr: 'ref', name: 'container' }],
        result: 'editor',
      };

      // Assert
      expect(isActionStep(callStep)).toBe(true);
    });

    it('should recognize SubscribeStep as valid ActionStep', () => {
      // Arrange
      const subscribeStep = {
        do: 'subscribe',
        target: { expr: 'state', name: 'editor' },
        event: 'onDidChangeModelContent',
        action: 'handleChange',
      };

      // Assert
      expect(isActionStep(subscribeStep)).toBe(true);
    });

    it('should recognize DisposeStep as valid ActionStep', () => {
      // Arrange
      const disposeStep = {
        do: 'dispose',
        target: { expr: 'state', name: 'editorInstance' },
      };

      // Assert
      expect(isActionStep(disposeStep)).toBe(true);
    });

    it('should still recognize existing action step types', () => {
      // Arrange
      const setStep = {
        do: 'set',
        target: 'count',
        value: { expr: 'lit', value: 0 },
      };

      const updateStep = {
        do: 'update',
        target: 'count',
        operation: 'increment',
      };

      const fetchStep = {
        do: 'fetch',
        url: { expr: 'lit', value: 'https://api.example.com' },
      };

      // Assert
      expect(isActionStep(setStep)).toBe(true);
      expect(isActionStep(updateStep)).toBe(true);
      expect(isActionStep(fetchStep)).toBe(true);
    });
  });

  // ==================== TypeScript Type Compatibility ====================

  describe('TypeScript type compatibility', () => {
    it('should allow ImportStep in ActionStep array', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'import',
          module: 'monaco-editor',
          result: 'monaco',
        } as ImportStep,
      ];

      expect(steps.length).toBe(1);
    });

    it('should allow CallStep in ActionStep array', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'call',
          target: { expr: 'var', name: 'monaco', path: 'editor.create' },
        } as CallStep,
      ];

      expect(steps.length).toBe(1);
    });

    it('should allow SubscribeStep in ActionStep array', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'subscribe',
          target: { expr: 'state', name: 'editor' },
          event: 'onChange',
          action: 'handleChange',
        } as SubscribeStep,
      ];

      expect(steps.length).toBe(1);
    });

    it('should allow DisposeStep in ActionStep array', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'dispose',
          target: { expr: 'state', name: 'editor' },
        } as DisposeStep,
      ];

      expect(steps.length).toBe(1);
    });

    it('should allow mixed action steps including external library steps', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'import',
          module: 'monaco-editor',
          result: 'monaco',
        } as ImportStep,
        {
          do: 'call',
          target: { expr: 'var', name: 'monaco', path: 'editor.create' },
          args: [{ expr: 'ref', name: 'container' }],
          result: 'editor',
        } as CallStep,
        {
          do: 'subscribe',
          target: { expr: 'var', name: 'editor' },
          event: 'onDidChangeModelContent',
          action: 'handleChange',
        } as SubscribeStep,
        {
          do: 'set',
          target: 'editorReady',
          value: { expr: 'lit', value: true },
        },
      ];

      expect(steps.length).toBe(4);
    });
  });
});

// ==================== Integration Tests ====================

describe('External Library Integration', () => {
  // ==================== Monaco Editor Example ====================

  describe('Monaco Editor integration example', () => {
    it('should support complete Monaco Editor integration workflow', () => {
      // This test documents the expected workflow for integrating Monaco Editor
      const monacoWorkflow = {
        // 1. Import the library
        importStep: {
          do: 'import',
          module: 'monaco-editor',
          result: 'monaco',
          onSuccess: [
            { do: 'set', target: 'monacoLoaded', value: { expr: 'lit', value: true } },
          ],
        } as ImportStep,

        // 2. Create editor instance
        createStep: {
          do: 'call',
          target: { expr: 'var', name: 'monaco', path: 'editor.create' },
          args: [
            { expr: 'ref', name: 'editorContainer' },
            { expr: 'lit', value: { language: 'typescript', theme: 'vs-dark' } },
          ],
          result: 'editorInstance',
        } as CallStep,

        // 3. Subscribe to content changes
        subscribeStep: {
          do: 'subscribe',
          target: { expr: 'state', name: 'editorInstance' },
          event: 'onDidChangeModelContent',
          action: 'handleEditorChange',
        } as SubscribeStep,

        // 4. Cleanup on unmount
        disposeStep: {
          do: 'dispose',
          target: { expr: 'state', name: 'editorInstance' },
        } as DisposeStep,

        // 5. View element with ref
        viewElement: {
          kind: 'element',
          tag: 'div',
          ref: 'editorContainer',
          props: {
            className: { expr: 'lit', value: 'editor-wrapper' },
            style: { expr: 'lit', value: 'height: 400px' },
          },
        } as ElementNode,
      };

      // Assert all steps are valid
      expect(isImportStep(monacoWorkflow.importStep)).toBe(true);
      expect(isCallStep(monacoWorkflow.createStep)).toBe(true);
      expect(isSubscribeStep(monacoWorkflow.subscribeStep)).toBe(true);
      expect(isDisposeStep(monacoWorkflow.disposeStep)).toBe(true);
      expect(isElementNode(monacoWorkflow.viewElement)).toBe(true);
    });
  });

  // ==================== Chart.js Example ====================

  describe('Chart.js integration example', () => {
    it('should support Chart.js integration workflow', () => {
      // This test documents the expected workflow for integrating Chart.js
      const chartWorkflow = {
        // 1. Import Chart.js
        importStep: {
          do: 'import',
          module: 'chart.js',
          result: 'Chart',
        } as ImportStep,

        // 2. Create chart instance
        createStep: {
          do: 'call',
          target: { expr: 'var', name: 'Chart' },
          args: [
            { expr: 'ref', name: 'chartCanvas' },
            { expr: 'state', name: 'chartConfig' },
          ],
          result: 'chartInstance',
        } as CallStep,

        // 3. Canvas element with ref
        viewElement: {
          kind: 'element',
          tag: 'canvas',
          ref: 'chartCanvas',
        } as ElementNode,

        // 4. Cleanup
        disposeStep: {
          do: 'dispose',
          target: { expr: 'state', name: 'chartInstance' },
        } as DisposeStep,
      };

      // Assert all steps are valid
      expect(isImportStep(chartWorkflow.importStep)).toBe(true);
      expect(isCallStep(chartWorkflow.createStep)).toBe(true);
      expect(isElementNode(chartWorkflow.viewElement)).toBe(true);
      expect(isDisposeStep(chartWorkflow.disposeStep)).toBe(true);
    });
  });
});
