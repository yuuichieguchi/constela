/**
 * Test module for refs context in evaluate calls.
 *
 * This test file verifies that refs are properly passed to evaluate()
 * in all renderer call sites. Currently, refs are NOT passed, causing
 * expressions that reference `refs.someRef` to fail.
 *
 * These tests are expected to FAIL (TDD Red Phase) until the fix is implemented.
 *
 * Affected evaluate call sites:
 * 1. renderElement (line 425) - props evaluation
 * 2. renderText (line 490) - text value evaluation
 * 3. renderIf (line 516) - condition evaluation
 * 4. renderEach (line 635) - items evaluation
 * 5. renderEach (line 707-711) - key evaluation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type {
  CompiledElementNode,
  CompiledTextNode,
  CompiledIfNode,
  CompiledEachNode,
  CompiledAction,
  CompiledExpression,
} from '@constela/compiler';

describe('refs in evaluate calls', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper to create context with refs ====================

  function createContextWithRefs(
    stateDefinitions: Record<string, { type: string; initial: unknown }> = {},
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {}
  ): RenderContext & { refs: Record<string, Element> } {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
      refs: {},
    };
  }

  // ==================== Helper to create refs expression ====================

  /**
   * Creates an expression that accesses a ref element's property.
   * Uses the 'ref' and 'get' expression types supported by the evaluator.
   *
   * e.g., refs.inputRef.value -> { expr: 'get', base: { expr: 'ref', name: 'inputRef' }, path: 'value' }
   */
  function createRefPropertyExpr(refName: string, property: string): CompiledExpression {
    return {
      expr: 'get',
      base: { expr: 'ref', name: refName },
      path: property,
    };
  }

  /**
   * Creates an expression that accesses a ref element directly.
   * e.g., refs.inputRef -> { expr: 'ref', name: 'inputRef' }
   */
  function createRefExpr(refName: string): CompiledExpression {
    return {
      expr: 'ref',
      name: refName,
    };
  }

  // ==================== renderElement: props evaluation ====================

  describe('renderElement - props evaluation should access refs', () => {
    it('should evaluate props expression that references refs.inputRef.value', () => {
      // Arrange
      const context = createContextWithRefs();

      // First, render an input with ref to collect it
      const inputNode: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        ref: 'inputRef',
        props: {
          type: { expr: 'lit', value: 'text' },
          value: { expr: 'lit', value: 'test-input-value' },
        },
      };
      const input = render(inputNode, context) as HTMLInputElement;
      container.appendChild(input);

      // Verify ref was collected
      expect(context.refs['inputRef']).toBe(input);

      // Now render an element that references refs.inputRef.value in its props
      // The data-value prop should contain the input's value
      const divNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          'data-value': createRefPropertyExpr('inputRef', 'value'),
        },
      };

      // Act
      const div = render(divNode, context) as HTMLElement;
      container.appendChild(div);

      // Assert - This should contain 'test-input-value' from the input
      // Currently FAILS because refs is not passed to evaluate in renderElement
      expect(div.getAttribute('data-value')).toBe('test-input-value');
    });

    it('should evaluate className expression that references refs.someDiv.className', () => {
      // Arrange
      const context = createContextWithRefs();

      // First, render a div with ref and className
      const sourceDiv: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'sourceDiv',
        props: {
          className: { expr: 'lit', value: 'source-class-name' },
        },
      };
      const source = render(sourceDiv, context) as HTMLElement;
      container.appendChild(source);

      expect(context.refs['sourceDiv']).toBe(source);

      // Now render an element that copies className from refs.sourceDiv
      const targetDiv: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: createRefPropertyExpr('sourceDiv', 'className'),
        },
      };

      // Act
      const target = render(targetDiv, context) as HTMLElement;
      container.appendChild(target);

      // Assert - Target should have the same className as source
      // Currently FAILS because refs is not passed to evaluate in renderElement
      expect(target.className).toBe('source-class-name');
    });
  });

  // ==================== renderText: text value evaluation ====================

  describe('renderText - text value evaluation should access refs', () => {
    it('should evaluate text value expression that references refs.inputRef.value', () => {
      // Arrange
      const context = createContextWithRefs();

      // First, render an input with ref
      const inputNode: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        ref: 'inputRef',
        props: {
          type: { expr: 'lit', value: 'text' },
          value: { expr: 'lit', value: 'displayed-text' },
        },
      };
      const input = render(inputNode, context) as HTMLInputElement;
      container.appendChild(input);

      expect(context.refs['inputRef']).toBe(input);

      // Now render a text node that displays refs.inputRef.value
      const textNode: CompiledTextNode = {
        kind: 'text',
        value: createRefPropertyExpr('inputRef', 'value'),
      };

      // Act
      const text = render(textNode, context);
      container.appendChild(text);

      // Assert - Text should display 'displayed-text'
      // Currently FAILS because refs is not passed to evaluate in renderText
      expect(text.textContent).toBe('displayed-text');
    });

    it('should evaluate text value expression that references refs.heading.textContent', () => {
      // Arrange
      const context = createContextWithRefs();

      // First, render a heading with ref
      const headingNode: CompiledElementNode = {
        kind: 'element',
        tag: 'h1',
        ref: 'heading',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Original Title' } },
        ],
      };
      const heading = render(headingNode, context) as HTMLElement;
      container.appendChild(heading);

      expect(context.refs['heading']).toBe(heading);

      // Now render a text node that displays refs.heading.textContent
      const textNode: CompiledTextNode = {
        kind: 'text',
        value: createRefPropertyExpr('heading', 'textContent'),
      };

      // Act
      const text = render(textNode, context);
      container.appendChild(text);

      // Assert - Text should display 'Original Title'
      // Currently FAILS because refs is not passed to evaluate in renderText
      expect(text.textContent).toBe('Original Title');
    });
  });

  // ==================== renderIf: condition evaluation ====================

  describe('renderIf - condition evaluation should access refs', () => {
    it('should evaluate condition expression that references refs.inputRef.value', () => {
      // Arrange
      const context = createContextWithRefs();

      // First, render an input with a non-empty value
      const inputNode: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        ref: 'inputRef',
        props: {
          type: { expr: 'lit', value: 'text' },
          value: { expr: 'lit', value: 'has-value' },
        },
      };
      const input = render(inputNode, context) as HTMLInputElement;
      container.appendChild(input);

      expect(context.refs['inputRef']).toBe(input);

      // Now render an if node that checks if refs.inputRef.value is truthy
      const ifNode: CompiledIfNode = {
        kind: 'if',
        condition: createRefPropertyExpr('inputRef', 'value'),
        then: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'has-value-indicator' } },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Input has value' } }],
        },
        else: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'empty-indicator' } },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Input is empty' } }],
        },
      };

      // Act
      const result = render(ifNode, context);
      container.appendChild(result);

      // Assert - Should show "Input has value" because input has a non-empty value
      // Currently FAILS because refs is not passed to evaluate in renderIf
      expect(container.querySelector('#has-value-indicator')).not.toBeNull();
      expect(container.querySelector('#empty-indicator')).toBeNull();
    });

    it('should evaluate condition expression that checks refs.checkbox.checked', () => {
      // Arrange
      const context = createContextWithRefs();

      // First, render a checked checkbox
      const checkboxNode: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        ref: 'checkbox',
        props: {
          type: { expr: 'lit', value: 'checkbox' },
          checked: { expr: 'lit', value: true },
        },
      };
      const checkbox = render(checkboxNode, context) as HTMLInputElement;
      container.appendChild(checkbox);
      // Manually set checked since setAttribute doesn't work for checked property
      checkbox.checked = true;

      expect(context.refs['checkbox']).toBe(checkbox);

      // Now render an if node that checks if refs.checkbox.checked is true
      const ifNode: CompiledIfNode = {
        kind: 'if',
        condition: createRefPropertyExpr('checkbox', 'checked'),
        then: {
          kind: 'text',
          value: { expr: 'lit', value: 'Checkbox is checked' },
        },
        else: {
          kind: 'text',
          value: { expr: 'lit', value: 'Checkbox is unchecked' },
        },
      };

      // Act
      const result = render(ifNode, context);
      container.appendChild(result);

      // Assert - Should show "Checkbox is checked"
      // Currently FAILS because refs is not passed to evaluate in renderIf
      expect(container.textContent).toContain('Checkbox is checked');
    });
  });

  // ==================== renderEach: items evaluation ====================

  describe('renderEach - items evaluation should access refs', () => {
    it('should evaluate items expression that references refs.dataSource.dataset (hypothetical)', () => {
      // Arrange
      const context = createContextWithRefs();

      // Create a div with data attributes to simulate a data source
      const dataSourceNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'dataSource',
        props: {
          'data-items': { expr: 'lit', value: 'item1,item2,item3' },
        },
      };
      const dataSource = render(dataSourceNode, context) as HTMLElement;
      container.appendChild(dataSource);

      expect(context.refs['dataSource']).toBe(dataSource);

      // For this test, we'll use a simpler approach:
      // Store an array directly in the ref element as a custom property
      (dataSource as unknown as { itemsArray: string[] }).itemsArray = ['A', 'B', 'C'];

      // Now render an each node that iterates over refs.dataSource.itemsArray
      const eachNode: CompiledEachNode = {
        kind: 'each',
        items: createRefPropertyExpr('dataSource', 'itemsArray'),
        as: 'item',
        body: {
          kind: 'element',
          tag: 'li',
          props: { className: { expr: 'lit', value: 'list-item' } },
          children: [{ kind: 'text', value: { expr: 'var', name: 'item' } }],
        },
      };

      // Act
      const result = render(eachNode, context);
      container.appendChild(result);

      // Assert - Should render 3 list items
      // Currently FAILS because refs is not passed to evaluate in renderEach
      const listItems = container.querySelectorAll('.list-item');
      expect(listItems.length).toBe(3);
      expect(listItems[0].textContent).toBe('A');
      expect(listItems[1].textContent).toBe('B');
      expect(listItems[2].textContent).toBe('C');
    });
  });

  // ==================== renderEach: key evaluation ====================

  describe('renderEach - key evaluation should access refs', () => {
    it('should evaluate key expression that references refs (with key based on ref property)', () => {
      // Arrange
      const context = createContextWithRefs();

      // Create a config element with a prefix for keys
      const configNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'config',
        props: {
          'data-prefix': { expr: 'lit', value: 'key-' },
        },
      };
      const config = render(configNode, context) as HTMLElement;
      container.appendChild(config);
      (config as unknown as { keyPrefix: string }).keyPrefix = 'prefix-';

      expect(context.refs['config']).toBe(config);

      // Now render an each node with a key that uses refs.config.keyPrefix
      // The key expression concatenates the prefix with the item
      const eachNode: CompiledEachNode = {
        kind: 'each',
        items: { expr: 'lit', value: [1, 2, 3] },
        as: 'num',
        key: {
          expr: 'bin',
          op: '+',
          left: createRefPropertyExpr('config', 'keyPrefix'),
          right: { expr: 'var', name: 'num' },
        },
        body: {
          kind: 'element',
          tag: 'span',
          props: { className: { expr: 'lit', value: 'keyed-item' } },
          children: [{ kind: 'text', value: { expr: 'var', name: 'num' } }],
        },
      };

      // Act
      const result = render(eachNode, context);
      container.appendChild(result);

      // Assert - Should render 3 items (key evaluation should work)
      // Currently FAILS because refs is not passed to evaluate in renderEach key evaluation
      const items = container.querySelectorAll('.keyed-item');
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe('1');
      expect(items[1].textContent).toBe('2');
      expect(items[2].textContent).toBe('3');
    });
  });

  // ==================== Event Handler Payload: refs access ====================

  describe('event handler payload - refs access', () => {
    /**
     * TDD Red Phase: These tests verify that event handler payloads can access refs.
     * Currently, the evaluatePayload call in createEventCallback (lines 253-257) does NOT
     * pass refs to the evaluation context, causing these tests to FAIL.
     *
     * Bug location: packages/runtime/src/renderer/index.ts, lines 253-257
     * Current code:
     *   payload = evaluatePayload(handler.payload, {
     *     state: ctx.state,
     *     locals: { ...ctx.locals, ...eventLocals },
     *     ...(ctx.imports && { imports: ctx.imports })
     *   });
     *
     * Missing: refs and route are not passed to the context
     */

    it('should evaluate payload expression that references refs.inputRef.value in event handler', async () => {
      // Arrange
      const submitValueAction: CompiledAction = {
        name: 'submitValue',
        steps: [
          { do: 'set', target: 'submittedValue', value: { expr: 'var', name: 'payload' } },
        ],
      };

      // First, create an input element with a ref
      const inputNode: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        ref: 'inputRef',
        props: {
          type: { expr: 'lit', value: 'text' },
        },
      };

      // Then, create a button that submits the input's value using refs.inputRef.value as payload
      const buttonNode: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: {
            event: 'click',
            action: 'submitValue',
            payload: {
              expr: 'get',
              base: { expr: 'ref', name: 'inputRef' },
              path: 'value',
            },
          },
        },
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Submit' } }],
      };

      const context = createContextWithRefs(
        { submittedValue: { type: 'string', initial: '' } },
        { submitValue: submitValueAction }
      );

      // Act
      const input = render(inputNode, context) as HTMLInputElement;
      container.appendChild(input);

      // Verify ref was collected
      expect(context.refs['inputRef']).toBe(input);

      // Set the input value
      input.value = 'user-typed-value';

      const button = render(buttonNode, context) as HTMLButtonElement;
      container.appendChild(button);

      // Click the button to trigger the event handler with refs.inputRef.value as payload
      button.click();

      // Wait for async event handler
      await Promise.resolve();

      // Assert - The submitted value should be 'user-typed-value' from the input
      // Currently FAILS because refs is not passed to evaluatePayload in createEventCallback
      expect(context.state.get('submittedValue')).toBe('user-typed-value');
    });

    it('should evaluate payload expression that references refs element directly', async () => {
      // Arrange
      const captureRefAction: CompiledAction = {
        name: 'captureRef',
        steps: [
          { do: 'set', target: 'capturedTagName', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'tagName' } },
        ],
      };

      // Create a div element with a ref
      const divNode: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'targetDiv',
        props: {
          id: { expr: 'lit', value: 'target-element' },
        },
      };

      // Create a button that captures the ref element itself as payload
      const buttonNode: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: {
            event: 'click',
            action: 'captureRef',
            payload: {
              expr: 'ref',
              name: 'targetDiv',
            },
          },
        },
      };

      const context = createContextWithRefs(
        { capturedTagName: { type: 'string', initial: '' } },
        { captureRef: captureRefAction }
      );

      // Act
      const div = render(divNode, context) as HTMLElement;
      container.appendChild(div);

      expect(context.refs['targetDiv']).toBe(div);

      const button = render(buttonNode, context) as HTMLButtonElement;
      container.appendChild(button);

      button.click();
      await Promise.resolve();

      // Assert - Should have captured the div element's tagName
      // Currently FAILS because refs is not passed to evaluatePayload in createEventCallback
      expect(context.state.get('capturedTagName')).toBe('DIV');
    });
  });

  // ==================== Event Handler Payload: route access ====================

  describe('event handler payload - route access', () => {
    /**
     * These tests verify that event handler payloads can access route.
     * The evaluatePayload call in createEventCallback passes route to the evaluation context.
     */

    it('should evaluate payload expression that references route.params in event handler', async () => {
      // Arrange
      const sendParamAction: CompiledAction = {
        name: 'sendParam',
        steps: [
          { do: 'set', target: 'receivedParam', value: { expr: 'var', name: 'payload' } },
        ],
      };

      // Create a button that sends route.params.id as payload
      const buttonNode: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: {
            event: 'click',
            action: 'sendParam',
            payload: {
              expr: 'route',
              name: 'id',
              source: 'param',
            },
          },
        },
      };

      // Create context with route
      const context: RenderContext & { refs: Record<string, Element> } = {
        state: createStateStore({ receivedParam: { type: 'string', initial: '' } }),
        actions: { sendParam: sendParamAction },
        locals: {},
        refs: {},
        route: {
          params: { id: '12345' },
          query: {},
          path: '/users/12345',
        },
      };

      // Act
      const button = render(buttonNode, context) as HTMLButtonElement;
      container.appendChild(button);

      button.click();
      await Promise.resolve();

      // Assert - Should have received the route param value
      expect(context.state.get('receivedParam')).toBe('12345');
    });

    it('should evaluate payload expression that references route.query in event handler', async () => {
      // Arrange
      const sendQueryAction: CompiledAction = {
        name: 'sendQuery',
        steps: [
          { do: 'set', target: 'receivedQuery', value: { expr: 'var', name: 'payload' } },
        ],
      };

      // Create a button that sends route.query.search as payload
      const buttonNode: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: {
            event: 'click',
            action: 'sendQuery',
            payload: {
              expr: 'route',
              name: 'search',
              source: 'query',
            },
          },
        },
      };

      // Create context with route
      const context: RenderContext & { refs: Record<string, Element> } = {
        state: createStateStore({ receivedQuery: { type: 'string', initial: '' } }),
        actions: { sendQuery: sendQueryAction },
        locals: {},
        refs: {},
        route: {
          params: {},
          query: { search: 'hello-world' },
          path: '/search?search=hello-world',
        },
      };

      // Act
      const button = render(buttonNode, context) as HTMLButtonElement;
      container.appendChild(button);

      button.click();
      await Promise.resolve();

      // Assert - Should have received the route query value
      expect(context.state.get('receivedQuery')).toBe('hello-world');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle refs being undefined gracefully when accessed in expression', () => {
      // Arrange - Create context without refs
      const context: RenderContext = {
        state: createStateStore({}),
        actions: {},
        locals: {},
        // Note: refs is NOT set
      };

      // Try to render a text node that references refs.nonExistent
      const textNode: CompiledTextNode = {
        kind: 'text',
        value: createRefPropertyExpr('nonExistent', 'value'),
      };

      // Act - Should not throw, but result will be undefined/empty
      const text = render(textNode, context);
      container.appendChild(text);

      // Assert - Text content should be empty or "undefined"
      // This test documents the current behavior (which may show undefined or empty)
      expect(text.textContent).toBe('');
    });

    it('should handle accessing non-existent ref name', () => {
      // Arrange
      const context = createContextWithRefs();

      // Render a text node that references a ref that doesn't exist
      const textNode: CompiledTextNode = {
        kind: 'text',
        value: createRefPropertyExpr('doesNotExist', 'value'),
      };

      // Act
      const text = render(textNode, context);
      container.appendChild(text);

      // Assert - Should handle gracefully (empty or undefined)
      // The exact behavior depends on the evaluate implementation
      expect(text.textContent).toBe('');
    });
  });
});
