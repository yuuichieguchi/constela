/**
 * Test module for Ref Expression evaluation.
 *
 * Coverage:
 * - Ref expression evaluates to DOM element from refs context
 * - Ref expression returns null for undefined ref
 * - Ref expression returns null when refs is undefined
 * - Ref expression works with multiple refs
 *
 * TDD Red Phase: These tests verify the runtime evaluation of ref expressions
 * that will be added to support external library integration in Constela DSL.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate, type EvaluationContext } from '../evaluator.js';
import type { CompiledExpression } from '@constela/compiler';

// Mock StateStore for testing
class MockStateStore {
  private state: Record<string, unknown>;

  constructor(initialState: Record<string, unknown> = {}) {
    this.state = initialState;
  }

  get(name: string): unknown {
    return this.state[name];
  }

  set(name: string, value: unknown): void {
    this.state[name] = value;
  }
}

describe('evaluate with Ref expressions', () => {
  // ==================== Setup ====================

  let mockState: MockStateStore;
  let baseContext: EvaluationContext;

  beforeEach(() => {
    mockState = new MockStateStore({ counter: 0 });
    baseContext = {
      state: mockState as EvaluationContext['state'],
      locals: {},
    };
  });

  // ==================== Helper Functions ====================

  /**
   * Creates an EvaluationContext with refs data
   */
  function createContextWithRefs(
    refs: Record<string, Element>
  ): EvaluationContext {
    return {
      state: mockState as EvaluationContext['state'],
      locals: {},
      refs,
    } as EvaluationContext;
  }

  // ==================== Basic Ref Evaluation ====================

  describe('basic ref evaluation', () => {
    it('should evaluate ref expression to DOM element', () => {
      // Arrange
      const element = document.createElement('div');
      const ctx = createContextWithRefs({ container: element });
      const expr: CompiledExpression = { expr: 'ref', name: 'container' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });

    it('should return null for undefined ref', () => {
      // Arrange
      const ctx = createContextWithRefs({});
      const expr: CompiledExpression = { expr: 'ref', name: 'nonexistent' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when refs is undefined', () => {
      // Arrange
      const ctx = baseContext; // No refs field
      const expr: CompiledExpression = { expr: 'ref', name: 'container' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeNull();
    });

    it('should work with multiple refs', () => {
      // Arrange
      const el1 = document.createElement('div');
      const el2 = document.createElement('input');
      const ctx = createContextWithRefs({ container: el1, input: el2 });

      // Act & Assert
      expect(evaluate({ expr: 'ref', name: 'container' } as CompiledExpression, ctx)).toBe(el1);
      expect(evaluate({ expr: 'ref', name: 'input' } as CompiledExpression, ctx)).toBe(el2);
    });
  });

  // ==================== Different Element Types ====================

  describe('different element types', () => {
    it('should evaluate ref to input element', () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'test value';
      const ctx = createContextWithRefs({ formInput: input });
      const expr: CompiledExpression = { expr: 'ref', name: 'formInput' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(input);
      expect((result as HTMLInputElement).type).toBe('text');
      expect((result as HTMLInputElement).value).toBe('test value');
    });

    it('should evaluate ref to canvas element', () => {
      // Arrange
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = createContextWithRefs({ chartCanvas: canvas });
      const expr: CompiledExpression = { expr: 'ref', name: 'chartCanvas' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(canvas);
      expect((result as HTMLCanvasElement).width).toBe(800);
      expect((result as HTMLCanvasElement).height).toBe(600);
    });

    it('should evaluate ref to video element', () => {
      // Arrange
      const video = document.createElement('video');
      const ctx = createContextWithRefs({ videoPlayer: video });
      const expr: CompiledExpression = { expr: 'ref', name: 'videoPlayer' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(video);
      expect(result).toBeInstanceOf(HTMLVideoElement);
    });
  });

  // ==================== Nested Expression Evaluation ====================

  describe('nested expression evaluation', () => {
    it('should evaluate ref expression in conditional', () => {
      // Arrange
      const element = document.createElement('div');
      const ctx = createContextWithRefs({ container: element });
      const expr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'lit', value: true },
        then: { expr: 'ref', name: 'container' },
        else: { expr: 'lit', value: null },
      };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });

    it('should evaluate ref expression in else branch of conditional', () => {
      // Arrange
      const element = document.createElement('span');
      const ctx = createContextWithRefs({ fallback: element });
      const expr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'lit', value: false },
        then: { expr: 'lit', value: null },
        else: { expr: 'ref', name: 'fallback' },
      };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });
  });

  // ==================== Integration with Other Expression Types ====================

  describe('integration with other expression types', () => {
    it('should work alongside state expressions', () => {
      // Arrange - Conditional based on state, returning ref
      mockState = new MockStateStore({ isVisible: true });
      const element = document.createElement('div');
      const ctx: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: {},
        refs: { modalContainer: element },
      } as EvaluationContext;

      const expr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'state', name: 'isVisible' },
        then: { expr: 'ref', name: 'modalContainer' },
        else: { expr: 'lit', value: null },
      };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });

    it('should work alongside var expressions', () => {
      // Arrange - Conditional based on local variable, returning ref
      const element = document.createElement('section');
      const ctx: EvaluationContext = {
        state: mockState as EvaluationContext['state'],
        locals: { shouldRender: true },
        refs: { sectionElement: element },
      } as EvaluationContext;

      const expr: CompiledExpression = {
        expr: 'cond',
        if: { expr: 'var', name: 'shouldRender' },
        then: { expr: 'ref', name: 'sectionElement' },
        else: { expr: 'lit', value: null },
      };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle ref with empty string name', () => {
      // Arrange
      const element = document.createElement('div');
      const ctx = createContextWithRefs({ '': element });
      const expr: CompiledExpression = { expr: 'ref', name: '' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });

    it('should handle ref name with special characters', () => {
      // Arrange
      const element = document.createElement('div');
      const ctx = createContextWithRefs({ 'editor-container': element });
      const expr: CompiledExpression = { expr: 'ref', name: 'editor-container' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });

    it('should handle ref name with underscore', () => {
      // Arrange
      const element = document.createElement('div');
      const ctx = createContextWithRefs({ editor_container: element });
      const expr: CompiledExpression = { expr: 'ref', name: 'editor_container' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(element);
    });

    it('should handle empty refs object', () => {
      // Arrange
      const ctx = createContextWithRefs({});
      const expr: CompiledExpression = { expr: 'ref', name: 'anyRef' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ==================== External Library Integration Use Cases ====================

  describe('external library integration use cases', () => {
    it('should provide container element for chart library initialization', () => {
      // Arrange - Simulating Chart.js or similar library use case
      const canvasElement = document.createElement('canvas');
      canvasElement.id = 'myChart';
      const ctx = createContextWithRefs({ chartCanvas: canvasElement });
      const expr: CompiledExpression = { expr: 'ref', name: 'chartCanvas' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(canvasElement);
      expect((result as HTMLCanvasElement).id).toBe('myChart');
    });

    it('should provide container element for code editor initialization', () => {
      // Arrange - Simulating Monaco Editor or CodeMirror use case
      const containerElement = document.createElement('div');
      containerElement.className = 'editor-container';
      const ctx = createContextWithRefs({ editorContainer: containerElement });
      const expr: CompiledExpression = { expr: 'ref', name: 'editorContainer' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(containerElement);
      expect((result as HTMLDivElement).className).toBe('editor-container');
    });

    it('should provide container element for map library initialization', () => {
      // Arrange - Simulating Leaflet or Google Maps use case
      const mapContainer = document.createElement('div');
      mapContainer.id = 'map';
      mapContainer.style.width = '100%';
      mapContainer.style.height = '400px';
      const ctx = createContextWithRefs({ mapContainer });
      const expr: CompiledExpression = { expr: 'ref', name: 'mapContainer' };

      // Act
      const result = evaluate(expr, ctx);

      // Assert
      expect(result).toBe(mapContainer);
      expect((result as HTMLDivElement).id).toBe('map');
    });
  });
});
