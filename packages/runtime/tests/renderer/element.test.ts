/**
 * Test module for Element Node Rendering.
 *
 * Coverage:
 * - Renders element with tag
 * - Applies props (className, id, etc.)
 * - Renders children
 * - Binds event handlers
 * - Updates props reactively
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledElementNode, CompiledNode, CompiledAction } from '@constela/compiler';

describe('render element node', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper to create context ====================

  function createContext(
    stateDefinitions: Record<string, { type: string; initial: unknown }> = {},
    actions: Record<string, CompiledAction> = {},
    locals: Record<string, unknown> = {}
  ): RenderContext {
    return {
      state: createStateStore(stateDefinitions),
      actions,
      locals,
    };
  }

  // ==================== Basic Element Rendering ====================

  describe('basic element rendering', () => {
    it('should render a div element', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result).toBeInstanceOf(HTMLDivElement);
      expect(result.tagName.toLowerCase()).toBe('div');
    });

    it('should render a span element', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'span',
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result).toBeInstanceOf(HTMLSpanElement);
      expect(result.tagName.toLowerCase()).toBe('span');
    });

    it('should render a button element', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result).toBeInstanceOf(HTMLButtonElement);
    });

    it('should render an input element', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result).toBeInstanceOf(HTMLInputElement);
    });

    it('should render a heading element', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'h1',
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  // ==================== Props Rendering ====================

  describe('props rendering', () => {
    it('should apply className prop', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: { expr: 'lit', value: 'container main' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.className).toBe('container main');
    });

    it('should apply id prop', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'my-element' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.id).toBe('my-element');
    });

    it('should apply style prop as string', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          style: { expr: 'lit', value: 'color: red; font-size: 16px;' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.style.color).toBe('red');
      expect(result.style.fontSize).toBe('16px');
    });

    it('should apply data attributes', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          'data-testid': { expr: 'lit', value: 'test-element' },
          'data-value': { expr: 'lit', value: '42' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.getAttribute('data-testid')).toBe('test-element');
      expect(result.getAttribute('data-value')).toBe('42');
    });

    it('should apply disabled prop on button', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          disabled: { expr: 'lit', value: true },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLButtonElement;

      // Assert
      expect(result.disabled).toBe(true);
    });

    it('should apply value prop on input', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        props: {
          value: { expr: 'lit', value: 'initial value' },
          type: { expr: 'lit', value: 'text' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLInputElement;

      // Assert
      expect(result.value).toBe('initial value');
      expect(result.type).toBe('text');
    });

    it('should apply href prop on anchor', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'a',
        props: {
          href: { expr: 'lit', value: 'https://example.com' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLAnchorElement;

      // Assert
      expect(result.href).toBe('https://example.com/');
    });

    it('should apply props from state', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: { expr: 'state', name: 'cssClass' },
        },
      };
      const context = createContext({
        cssClass: { type: 'string', initial: 'dynamic-class' },
      });

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.className).toBe('dynamic-class');
    });
  });

  // ==================== Children Rendering ====================

  describe('children rendering', () => {
    it('should render child elements', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        children: [
          { kind: 'element', tag: 'span' },
          { kind: 'element', tag: 'span' },
        ],
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.children.length).toBe(2);
      expect(result.children[0].tagName.toLowerCase()).toBe('span');
      expect(result.children[1].tagName.toLowerCase()).toBe('span');
    });

    it('should render nested child elements', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'ul',
            children: [
              { kind: 'element', tag: 'li' },
              { kind: 'element', tag: 'li' },
            ],
          },
        ],
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.children.length).toBe(1);
      const ul = result.children[0] as HTMLUListElement;
      expect(ul.tagName.toLowerCase()).toBe('ul');
      expect(ul.children.length).toBe(2);
    });

    it('should render text children', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'p',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Hello, World!' } },
        ],
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.textContent).toBe('Hello, World!');
    });

    it('should render mixed children (elements and text)', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'p',
        children: [
          { kind: 'text', value: { expr: 'lit', value: 'Hello, ' } },
          {
            kind: 'element',
            tag: 'strong',
            children: [{ kind: 'text', value: { expr: 'lit', value: 'World' } }],
          },
          { kind: 'text', value: { expr: 'lit', value: '!' } },
        ],
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.innerHTML).toContain('Hello, ');
      expect(result.innerHTML).toContain('<strong>World</strong>');
      expect(result.textContent).toBe('Hello, World!');
    });
  });

  // ==================== Event Binding ====================

  describe('event binding', () => {
    it('should bind click event handler', () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };

      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: { event: 'click', action: 'increment' },
        },
      };
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction }
      );

      // Act
      const result = render(node, context) as HTMLButtonElement;
      container.appendChild(result);
      result.click();

      // Assert
      expect(context.state.get('count')).toBe(1);
    });

    it('should bind multiple event handlers', () => {
      // Arrange
      const mouseEnterAction: CompiledAction = {
        name: 'onEnter',
        steps: [
          { do: 'set', target: 'hovered', value: { expr: 'lit', value: true } },
        ],
      };
      const mouseLeaveAction: CompiledAction = {
        name: 'onLeave',
        steps: [
          { do: 'set', target: 'hovered', value: { expr: 'lit', value: false } },
        ],
      };

      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          onMouseenter: { event: 'mouseenter', action: 'onEnter' },
          onMouseleave: { event: 'mouseleave', action: 'onLeave' },
        },
      };
      const context = createContext(
        { hovered: { type: 'number', initial: 0 } },
        { onEnter: mouseEnterAction, onLeave: mouseLeaveAction }
      );

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      result.dispatchEvent(new MouseEvent('mouseenter'));
      expect(context.state.get('hovered')).toBe(true);

      result.dispatchEvent(new MouseEvent('mouseleave'));
      expect(context.state.get('hovered')).toBe(false);
    });

    it('should pass payload to action', () => {
      // Arrange
      const setValueAction: CompiledAction = {
        name: 'setValue',
        steps: [
          { do: 'set', target: 'value', value: { expr: 'var', name: 'payload' } },
        ],
      };

      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: {
            event: 'click',
            action: 'setValue',
            payload: { expr: 'lit', value: 42 },
          },
        },
      };
      const context = createContext(
        { value: { type: 'number', initial: 0 } },
        { setValue: setValueAction }
      );

      // Act
      const result = render(node, context) as HTMLButtonElement;
      container.appendChild(result);
      result.click();

      // Assert
      expect(context.state.get('value')).toBe(42);
    });
  });

  // ==================== Reactive Updates ====================

  describe('reactive updates', () => {
    it('should update className when state changes', async () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: { expr: 'state', name: 'cssClass' },
        },
      };
      const context = createContext({
        cssClass: { type: 'string', initial: 'initial-class' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      expect(result.className).toBe('initial-class');

      // Update state
      context.state.set('cssClass', 'updated-class');

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(result.className).toBe('updated-class');
    });

    it('should update disabled prop when state changes', async () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          disabled: { expr: 'state', name: 'isDisabled' },
        },
      };
      const context = createContext({
        isDisabled: { type: 'number', initial: 0 },
      });

      // Act
      const result = render(node, context) as HTMLButtonElement;
      container.appendChild(result);

      expect(result.disabled).toBe(false);

      // Update state
      context.state.set('isDisabled', 1);

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(result.disabled).toBe(true);
    });

    it('should update computed className', async () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          className: {
            expr: 'bin',
            op: '+',
            left: { expr: 'lit', value: 'status-' },
            right: { expr: 'state', name: 'status' },
          },
        },
      };
      const context = createContext({
        status: { type: 'string', initial: 'pending' },
      });

      // Act
      const result = render(node, context) as HTMLElement;
      container.appendChild(result);

      expect(result.className).toBe('status-pending');

      // Update state
      context.state.set('status', 'complete');

      // Wait for reactivity
      await Promise.resolve();

      // Assert
      expect(result.className).toBe('status-complete');
    });
  });

  // ==================== Input/Change Event Handling ====================

  describe('input/change event handling', () => {
    it('should pass event.target.value as value local for input event', async () => {
      // Arrange
      const setInputValueAction: CompiledAction = {
        name: 'setInputValue',
        steps: [
          { do: 'set', target: 'inputValue', value: { expr: 'var', name: 'value' } },
        ],
      };

      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'text' },
          onInput: {
            event: 'input',
            action: 'setInputValue',
            payload: { expr: 'var', name: 'value' },
          },
        },
      };
      const context = createContext(
        { inputValue: { type: 'string', initial: '' } },
        { setInputValue: setInputValueAction }
      );

      // Act
      const result = render(node, context) as HTMLInputElement;
      container.appendChild(result);

      // Simulate user typing by setting value and dispatching input event
      result.value = 'hello world';
      result.dispatchEvent(new Event('input', { bubbles: true }));

      // Wait for async event handler
      await Promise.resolve();

      // Assert
      expect(context.state.get('inputValue')).toBe('hello world');
    });

    it('should pass event.target.value as value local for change event', async () => {
      // Arrange
      const setChangeValueAction: CompiledAction = {
        name: 'setChangeValue',
        steps: [
          { do: 'set', target: 'selectedValue', value: { expr: 'var', name: 'value' } },
        ],
      };

      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'select',
        props: {
          onChange: {
            event: 'change',
            action: 'setChangeValue',
            payload: { expr: 'var', name: 'value' },
          },
        },
        children: [
          {
            kind: 'element',
            tag: 'option',
            props: { value: { expr: 'lit', value: 'option1' } },
            children: [{ kind: 'text', value: { expr: 'lit', value: 'Option 1' } }],
          },
          {
            kind: 'element',
            tag: 'option',
            props: { value: { expr: 'lit', value: 'option2' } },
            children: [{ kind: 'text', value: { expr: 'lit', value: 'Option 2' } }],
          },
        ],
      };
      const context = createContext(
        { selectedValue: { type: 'string', initial: '' } },
        { setChangeValue: setChangeValueAction }
      );

      // Act
      const result = render(node, context) as HTMLSelectElement;
      container.appendChild(result);

      // Simulate selecting an option
      result.value = 'option2';
      result.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for async event handler
      await Promise.resolve();

      // Assert
      expect(context.state.get('selectedValue')).toBe('option2');
    });

    it('should pass event.target.checked as checked local for checkbox change event', async () => {
      // Arrange
      const setCheckedAction: CompiledAction = {
        name: 'setChecked',
        steps: [
          { do: 'set', target: 'isChecked', value: { expr: 'var', name: 'checked' } },
        ],
      };

      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'checkbox' },
          onChange: {
            event: 'change',
            action: 'setChecked',
            payload: { expr: 'var', name: 'checked' },
          },
        },
      };
      const context = createContext(
        { isChecked: { type: 'number', initial: 0 } },
        { setChecked: setCheckedAction }
      );

      // Act
      const result = render(node, context) as HTMLInputElement;
      container.appendChild(result);

      // Simulate checking the checkbox
      result.checked = true;
      result.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for async event handler
      await Promise.resolve();

      // Assert
      expect(context.state.get('isChecked')).toBe(true);
    });

    it('should maintain backward compatibility - click event without value local should still work', async () => {
      // Arrange
      const incrementAction: CompiledAction = {
        name: 'increment',
        steps: [
          { do: 'update', target: 'count', operation: 'increment' },
        ],
      };

      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'button',
        props: {
          onClick: { event: 'click', action: 'increment' },
        },
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Click me' } }],
      };
      const context = createContext(
        { count: { type: 'number', initial: 0 } },
        { increment: incrementAction }
      );

      // Act
      const result = render(node, context) as HTMLButtonElement;
      container.appendChild(result);
      result.click();

      // Wait for async event handler
      await Promise.resolve();

      // Assert
      expect(context.state.get('count')).toBe(1);
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle element with no props or children', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result).toBeInstanceOf(HTMLDivElement);
      expect(result.children.length).toBe(0);
    });

    it('should handle empty children array', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        children: [],
      };
      const context = createContext();

      // Act
      const result = render(node, context) as HTMLElement;

      // Assert
      expect(result.children.length).toBe(0);
    });

    it('should handle SVG elements', () => {
      // Arrange
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'svg',
        props: {
          width: { expr: 'lit', value: '100' },
          height: { expr: 'lit', value: '100' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);

      // Assert
      expect(result.tagName.toLowerCase()).toBe('svg');
    });
  });

  // ==================== Ref Collection ====================

  describe('ref collection', () => {
    it('should collect ref when node.ref is specified', () => {
      // Arrange
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'container',
        props: {
          id: { expr: 'lit', value: 'my-container' },
        },
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      const result = render(node, context);

      // Assert
      expect(refs['container']).toBe(result);
      expect(refs['container']).toBeInstanceOf(HTMLDivElement);
    });

    it('should not collect ref when node.ref is not specified', () => {
      // Arrange
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'no-ref' },
        },
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      render(node, context);

      // Assert
      expect(Object.keys(refs).length).toBe(0);
    });

    it('should collect multiple refs from nested elements', () => {
      // Arrange
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'form',
        ref: 'form',
        children: [
          {
            kind: 'element',
            tag: 'input',
            ref: 'nameInput',
            props: { type: { expr: 'lit', value: 'text' } },
          },
          {
            kind: 'element',
            tag: 'input',
            ref: 'emailInput',
            props: { type: { expr: 'lit', value: 'email' } },
          },
          {
            kind: 'element',
            tag: 'button',
            ref: 'submitBtn',
            props: { type: { expr: 'lit', value: 'submit' } },
          },
        ],
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      const result = render(node, context);

      // Assert
      expect(Object.keys(refs).length).toBe(4);
      expect(refs['form']).toBe(result);
      expect(refs['nameInput']).toBeInstanceOf(HTMLInputElement);
      expect(refs['emailInput']).toBeInstanceOf(HTMLInputElement);
      expect(refs['submitBtn']).toBeInstanceOf(HTMLButtonElement);
    });

    it('should collect refs from deeply nested elements', () => {
      // Arrange
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'outer',
        children: [
          {
            kind: 'element',
            tag: 'section',
            ref: 'middle',
            children: [
              {
                kind: 'element',
                tag: 'article',
                ref: 'inner',
                children: [
                  { kind: 'text', value: { expr: 'lit', value: 'Content' } },
                ],
              },
            ],
          },
        ],
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      render(node, context);

      // Assert
      expect(refs['outer']).toBeInstanceOf(HTMLDivElement);
      expect(refs['middle']).toBeInstanceOf(HTMLElement); // section
      expect(refs['inner']).toBeInstanceOf(HTMLElement); // article
    });

    it('should handle refs on input elements for focus use case', () => {
      // Arrange
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'input',
        ref: 'searchInput',
        props: {
          type: { expr: 'lit', value: 'text' },
          placeholder: { expr: 'lit', value: 'Search...' },
        },
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      const result = render(node, context) as HTMLInputElement;
      container.appendChild(result);

      // Assert - ref should be usable for DOM manipulation
      expect(refs['searchInput']).toBe(result);
      expect((refs['searchInput'] as HTMLInputElement).type).toBe('text');
    });

    it('should handle refs on canvas elements for drawing use case', () => {
      // Arrange
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'canvas',
        ref: 'chartCanvas',
        props: {
          width: { expr: 'lit', value: '400' },
          height: { expr: 'lit', value: '300' },
        },
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      render(node, context);

      // Assert
      expect(refs['chartCanvas']).toBeInstanceOf(HTMLCanvasElement);
    });

    it('should handle refs on video elements for media control use case', () => {
      // Arrange
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'video',
        ref: 'videoPlayer',
        props: {
          controls: { expr: 'lit', value: true },
        },
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      render(node, context);

      // Assert
      expect(refs['videoPlayer']).toBeInstanceOf(HTMLVideoElement);
    });

    it('should overwrite ref if same name is used multiple times', () => {
      // Arrange - This documents the expected behavior when ref names collide
      const refs: Record<string, Element> = {};
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'element',
            tag: 'span',
            ref: 'duplicate',
            children: [{ kind: 'text', value: { expr: 'lit', value: 'First' } }],
          },
          {
            kind: 'element',
            tag: 'span',
            ref: 'duplicate',
            children: [{ kind: 'text', value: { expr: 'lit', value: 'Second' } }],
          },
        ],
      };
      const context = createContext();
      (context as { refs?: Record<string, Element> }).refs = refs;

      // Act
      render(node, context);

      // Assert - last element with the ref name wins
      expect(refs['duplicate'].textContent).toBe('Second');
    });

    it('should work when refs object is not provided in context', () => {
      // Arrange - refs collection should not break if refs is undefined
      const node: CompiledElementNode = {
        kind: 'element',
        tag: 'div',
        ref: 'container',
      };
      const context = createContext();
      // Note: not setting context.refs

      // Act & Assert - should not throw
      expect(() => {
        render(node, context);
      }).not.toThrow();
    });
  });
});
