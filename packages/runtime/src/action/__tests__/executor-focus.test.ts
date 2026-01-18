/**
 * Test module for Focus Action Step Executor.
 *
 * Coverage:
 * - Focus step with 'focus' operation on element by ref name
 * - Focus step with 'blur' operation on element by ref name
 * - Focus step with 'select' operation on input element by ref name
 * - Handling non-existent ref gracefully
 * - onSuccess/onError callbacks
 *
 * TDD Red Phase: These tests verify the runtime execution of focus action steps
 * that will be added to support form element focus management in Constela DSL.
 * All tests should FAIL initially because the implementation does not exist yet.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../executor.js';
import type { ActionContext } from '../executor.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledAction, CompiledActionStep } from '@constela/compiler';

/**
 * Type definition for FocusStep - to be added to @constela/compiler
 * This serves as documentation for the expected interface.
 */
interface FocusStep {
  do: 'focus';
  target: { expr: 'ref'; name: string } | { expr: 'lit'; value: string };
  operation: 'focus' | 'blur' | 'select';
  onSuccess?: CompiledActionStep[];
  onError?: CompiledActionStep[];
}

describe('executeAction with Focus Steps', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  // ==================== Helper Functions ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }>,
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {},
    refs: Record<string, Element> = {}
  ): ActionContext {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
      refs,
    };
  }

  // ==================== Focus Operation Tests ====================

  describe('focus operation', () => {
    it('should focus element by ref name', async () => {
      // Arrange
      const input = document.createElement('input');
      input.id = 'test-input';
      container.appendChild(input);

      const action: CompiledAction = {
        name: 'focusInput',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'focus',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { myInput: input });

      // Spy on focus method
      const focusSpy = vi.spyOn(input, 'focus');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(focusSpy).toHaveBeenCalled();
      expect(document.activeElement).toBe(input);
    });

    it('should focus textarea element by ref name', async () => {
      // Arrange
      const textarea = document.createElement('textarea');
      textarea.id = 'test-textarea';
      container.appendChild(textarea);

      const action: CompiledAction = {
        name: 'focusTextarea',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myTextarea' },
            operation: 'focus',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { myTextarea: textarea });
      const focusSpy = vi.spyOn(textarea, 'focus');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus button element by ref name', async () => {
      // Arrange
      const button = document.createElement('button');
      button.id = 'test-button';
      container.appendChild(button);

      const action: CompiledAction = {
        name: 'focusButton',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'submitBtn' },
            operation: 'focus',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { submitBtn: button });
      const focusSpy = vi.spyOn(button, 'focus');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should execute onSuccess callback after successful focus', async () => {
      // Arrange
      const input = document.createElement('input');
      container.appendChild(input);

      const action: CompiledAction = {
        name: 'focusWithSuccess',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'focus',
            onSuccess: [
              { do: 'set', target: 'focused', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { focused: { type: 'boolean', initial: false } },
        {},
        {},
        { myInput: input }
      );

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(context.state.get('focused')).toBe(true);
    });
  });

  // ==================== Blur Operation Tests ====================

  describe('blur operation', () => {
    it('should blur element by ref name', async () => {
      // Arrange
      const input = document.createElement('input');
      input.id = 'test-input';
      container.appendChild(input);
      input.focus(); // Focus first

      const action: CompiledAction = {
        name: 'blurInput',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'blur',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { myInput: input });
      const blurSpy = vi.spyOn(input, 'blur');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(blurSpy).toHaveBeenCalled();
    });

    it('should blur textarea element by ref name', async () => {
      // Arrange
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);
      textarea.focus();

      const action: CompiledAction = {
        name: 'blurTextarea',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myTextarea' },
            operation: 'blur',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { myTextarea: textarea });
      const blurSpy = vi.spyOn(textarea, 'blur');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(blurSpy).toHaveBeenCalled();
    });

    it('should execute onSuccess callback after successful blur', async () => {
      // Arrange
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const action: CompiledAction = {
        name: 'blurWithSuccess',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'blur',
            onSuccess: [
              { do: 'set', target: 'blurred', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { blurred: { type: 'boolean', initial: false } },
        {},
        {},
        { myInput: input }
      );

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(context.state.get('blurred')).toBe(true);
    });
  });

  // ==================== Select Operation Tests ====================

  describe('select operation', () => {
    it('should select text in input element by ref name', async () => {
      // Arrange
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'Hello World';
      container.appendChild(input);

      const action: CompiledAction = {
        name: 'selectInput',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'select',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { myInput: input });
      const selectSpy = vi.spyOn(input, 'select');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(selectSpy).toHaveBeenCalled();
    });

    it('should select text in textarea element by ref name', async () => {
      // Arrange
      const textarea = document.createElement('textarea');
      textarea.value = 'Some text content';
      container.appendChild(textarea);

      const action: CompiledAction = {
        name: 'selectTextarea',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myTextarea' },
            operation: 'select',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { myTextarea: textarea });
      const selectSpy = vi.spyOn(textarea, 'select');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(selectSpy).toHaveBeenCalled();
    });

    it('should execute onSuccess callback after successful select', async () => {
      // Arrange
      const input = document.createElement('input');
      input.value = 'Test';
      container.appendChild(input);

      const action: CompiledAction = {
        name: 'selectWithSuccess',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'select',
            onSuccess: [
              { do: 'set', target: 'selected', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { selected: { type: 'boolean', initial: false } },
        {},
        {},
        { myInput: input }
      );

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(context.state.get('selected')).toBe(true);
    });
  });

  // ==================== Error Handling Tests ====================

  describe('error handling', () => {
    it('should handle non-existent ref gracefully without throwing', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'focusNonExistent',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'nonExistentRef' },
            operation: 'focus',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, {});

      // Act & Assert - Should not throw
      await expect(executeAction(action, context)).resolves.not.toThrow();
    });

    it('should execute onError callback when ref does not exist', async () => {
      // Arrange
      const action: CompiledAction = {
        name: 'focusWithError',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'nonExistentRef' },
            operation: 'focus',
            onError: [
              { do: 'set', target: 'hasError', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { hasError: { type: 'boolean', initial: false } },
        {},
        {},
        {}
      );

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(context.state.get('hasError')).toBe(true);
    });

    it('should handle select on element without select method gracefully', async () => {
      // Arrange - div element doesn't have select() method
      const div = document.createElement('div');
      container.appendChild(div);

      const action: CompiledAction = {
        name: 'selectDiv',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myDiv' },
            operation: 'select',
            onError: [
              { do: 'set', target: 'selectFailed', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { selectFailed: { type: 'boolean', initial: false } },
        {},
        {},
        { myDiv: div }
      );

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      // Either gracefully skip (no error) or call onError
      // This test verifies the behavior is defined for this edge case
      expect(context.state.get('selectFailed')).toBe(true);
    });
  });

  // ==================== Integration Tests ====================

  describe('integration with other steps', () => {
    it('should execute focus step in sequence with set step', async () => {
      // Arrange
      const input = document.createElement('input');
      container.appendChild(input);

      const action: CompiledAction = {
        name: 'focusSequence',
        steps: [
          { do: 'set', target: 'status', value: { expr: 'lit', value: 'focusing' } },
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'focus',
          } as unknown as CompiledActionStep,
          { do: 'set', target: 'status', value: { expr: 'lit', value: 'focused' } },
        ],
      };

      const context = createContext(
        { status: { type: 'string', initial: 'idle' } },
        {},
        {},
        { myInput: input }
      );

      const focusSpy = vi.spyOn(input, 'focus');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(focusSpy).toHaveBeenCalled();
      expect(context.state.get('status')).toBe('focused');
    });

    it('should execute focus then blur in sequence', async () => {
      // Arrange
      const input = document.createElement('input');
      container.appendChild(input);

      const action: CompiledAction = {
        name: 'focusThenBlur',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'focus',
          } as unknown as CompiledActionStep,
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'blur',
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext({}, {}, {}, { myInput: input });

      const focusSpy = vi.spyOn(input, 'focus');
      const blurSpy = vi.spyOn(input, 'blur');

      // Act
      await executeAction(action, context);

      // Assert - Should FAIL because focus step is not implemented
      expect(focusSpy).toHaveBeenCalled();
      expect(blurSpy).toHaveBeenCalled();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle focus on already focused element', async () => {
      // Arrange
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus(); // Already focused

      const action: CompiledAction = {
        name: 'focusAlreadyFocused',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'focus',
            onSuccess: [
              { do: 'set', target: 'success', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { success: { type: 'boolean', initial: false } },
        {},
        {},
        { myInput: input }
      );

      // Act
      await executeAction(action, context);

      // Assert - Should still succeed
      expect(context.state.get('success')).toBe(true);
    });

    it('should handle blur on already blurred element', async () => {
      // Arrange
      const input = document.createElement('input');
      container.appendChild(input);
      // input is not focused initially

      const action: CompiledAction = {
        name: 'blurAlreadyBlurred',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'blur',
            onSuccess: [
              { do: 'set', target: 'success', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { success: { type: 'boolean', initial: false } },
        {},
        {},
        { myInput: input }
      );

      // Act
      await executeAction(action, context);

      // Assert - Should still succeed
      expect(context.state.get('success')).toBe(true);
    });

    it('should handle select on empty input', async () => {
      // Arrange
      const input = document.createElement('input');
      input.value = ''; // Empty
      container.appendChild(input);

      const action: CompiledAction = {
        name: 'selectEmpty',
        steps: [
          {
            do: 'focus',
            target: { expr: 'ref', name: 'myInput' },
            operation: 'select',
            onSuccess: [
              { do: 'set', target: 'success', value: { expr: 'lit', value: true } },
            ],
          } as unknown as CompiledActionStep,
        ],
      };

      const context = createContext(
        { success: { type: 'boolean', initial: false } },
        {},
        {},
        { myInput: input }
      );

      // Act
      await executeAction(action, context);

      // Assert - Should still succeed (selecting empty text is valid)
      expect(context.state.get('success')).toBe(true);
    });
  });
});
