/**
 * Test module for Renderer Event Information Expansion.
 *
 * Coverage:
 * - KeyboardEvent data extraction (key, code, modifier keys)
 * - MouseEvent data extraction (clientX/Y, pageX/Y, button)
 * - TouchEvent data extraction (touches, changedTouches)
 * - Scroll event data extraction (scrollTop, scrollLeft)
 * - Integration with existing value/checked extraction
 *
 * TDD Red Phase: These tests verify that the renderer properly extracts
 * extended event information and makes it available through payload expressions.
 * All tests should FAIL initially because the implementation does not exist yet.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, type RenderContext } from '../index.js';
import { createStateStore } from '../../state/store.js';
import type { CompiledNode, CompiledAction } from '@constela/compiler';

describe('Renderer Event Information Expansion', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllMocks();
  });

  // ==================== Helper Functions ====================

  function createRenderContext(
    overrides?: Partial<RenderContext>
  ): RenderContext {
    return {
      state: createStateStore({}),
      actions: {},
      locals: {},
      cleanups: [],
      refs: {},
      ...overrides,
    };
  }

  /**
   * Creates a mock KeyboardEvent with specified properties
   */
  function createKeyboardEvent(
    type: string,
    options: Partial<KeyboardEventInit> = {}
  ): KeyboardEvent {
    return new KeyboardEvent(type, {
      key: 'Enter',
      code: 'Enter',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      bubbles: true,
      cancelable: true,
      ...options,
    });
  }

  /**
   * Creates a mock MouseEvent with specified properties
   */
  function createMouseEvent(
    type: string,
    options: Partial<MouseEventInit> = {}
  ): MouseEvent {
    return new MouseEvent(type, {
      clientX: 100,
      clientY: 200,
      pageX: 150,
      pageY: 250,
      button: 0,
      bubbles: true,
      cancelable: true,
      ...options,
    });
  }

  /**
   * Creates a mock Touch object
   */
  function createTouch(options: {
    identifier: number;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
    target: EventTarget;
  }): Touch {
    return {
      identifier: options.identifier,
      target: options.target,
      clientX: options.clientX,
      clientY: options.clientY,
      pageX: options.pageX,
      pageY: options.pageY,
      screenX: options.clientX,
      screenY: options.clientY,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    } as Touch;
  }

  /**
   * Creates a mock TouchEvent with specified touches
   */
  function createTouchEvent(
    type: string,
    target: EventTarget,
    touches: Touch[],
    changedTouches: Touch[]
  ): TouchEvent {
    // jsdom doesn't fully support TouchEvent, so we create a custom event
    const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
    Object.defineProperty(event, 'touches', { value: touches, writable: false });
    Object.defineProperty(event, 'changedTouches', { value: changedTouches, writable: false });
    Object.defineProperty(event, 'targetTouches', { value: touches, writable: false });
    return event;
  }

  // ==================== KeyboardEvent Tests ====================

  describe('KeyboardEvent data extraction', () => {
    it('should extract key and code from keydown event', async () => {
      // Arrange
      const receivedPayload: Record<string, unknown> = {};

      const mockAction: CompiledAction = {
        name: 'handleKeydown',
        steps: [],
      };

      // Override executeAction to capture the payload
      const actions: Record<string, CompiledAction> = {
        handleKeydown: mockAction,
      };

      const state = createStateStore({
        receivedKey: { type: 'string', initial: '' },
        receivedCode: { type: 'string', initial: '' },
      });

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'test-input' },
          onKeydown: {
            event: 'keydown',
            action: 'handleKeydown',
            payload: {
              key: { expr: 'var', name: 'key' },
              code: { expr: 'var', name: 'code' },
            },
          },
        },
      };

      // Custom action that captures payload
      const captureAction: CompiledAction = {
        name: 'handleKeydown',
        steps: [
          { do: 'set', target: 'receivedKey', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'key' } },
          { do: 'set', target: 'receivedCode', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'code' } },
        ],
      };

      const ctx = createRenderContext({
        state,
        actions: { handleKeydown: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#test-input') as HTMLInputElement;
      const keyEvent = createKeyboardEvent('keydown', {
        key: 'a',
        code: 'KeyA',
      });
      input.dispatchEvent(keyEvent);

      // Wait for async action execution
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - These should FAIL because key/code are not extracted yet
      expect(state.get('receivedKey')).toBe('a');
      expect(state.get('receivedCode')).toBe('KeyA');
    });

    it('should extract modifier keys from keydown event', async () => {
      // Arrange
      const state = createStateStore({
        ctrlKey: { type: 'boolean', initial: false },
        shiftKey: { type: 'boolean', initial: false },
        altKey: { type: 'boolean', initial: false },
        metaKey: { type: 'boolean', initial: false },
      });

      const captureAction: CompiledAction = {
        name: 'handleKeydown',
        steps: [
          { do: 'set', target: 'ctrlKey', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'ctrlKey' } },
          { do: 'set', target: 'shiftKey', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'shiftKey' } },
          { do: 'set', target: 'altKey', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'altKey' } },
          { do: 'set', target: 'metaKey', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'metaKey' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'modifier-input' },
          onKeydown: {
            event: 'keydown',
            action: 'handleKeydown',
            payload: {
              ctrlKey: { expr: 'var', name: 'ctrlKey' },
              shiftKey: { expr: 'var', name: 'shiftKey' },
              altKey: { expr: 'var', name: 'altKey' },
              metaKey: { expr: 'var', name: 'metaKey' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleKeydown: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#modifier-input') as HTMLInputElement;
      const keyEvent = createKeyboardEvent('keydown', {
        key: 'A',
        code: 'KeyA',
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        metaKey: false,
      });
      input.dispatchEvent(keyEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - These should FAIL because modifier keys are not extracted yet
      expect(state.get('ctrlKey')).toBe(true);
      expect(state.get('shiftKey')).toBe(true);
      expect(state.get('altKey')).toBe(false);
      expect(state.get('metaKey')).toBe(false);
    });

    it('should pass keyboard data through payload expression for keyup event', async () => {
      // Arrange
      const state = createStateStore({
        receivedKey: { type: 'string', initial: '' },
      });

      const captureAction: CompiledAction = {
        name: 'handleKeyup',
        steps: [
          { do: 'set', target: 'receivedKey', value: { expr: 'var', name: 'payload' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'keyup-input' },
          onKeyup: {
            event: 'keyup',
            action: 'handleKeyup',
            payload: { expr: 'var', name: 'key' },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleKeyup: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#keyup-input') as HTMLInputElement;
      const keyEvent = createKeyboardEvent('keyup', {
        key: 'Escape',
        code: 'Escape',
      });
      input.dispatchEvent(keyEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because key is not extracted yet
      expect(state.get('receivedKey')).toBe('Escape');
    });
  });

  // ==================== MouseEvent Tests ====================

  describe('MouseEvent data extraction', () => {
    it('should extract clientX/clientY from click event', async () => {
      // Arrange
      const state = createStateStore({
        clientX: { type: 'number', initial: 0 },
        clientY: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'set', target: 'clientX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'clientX' } },
          { do: 'set', target: 'clientY', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'clientY' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'click-div' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            payload: {
              clientX: { expr: 'var', name: 'clientX' },
              clientY: { expr: 'var', name: 'clientY' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#click-div') as HTMLDivElement;
      const mouseEvent = createMouseEvent('click', {
        clientX: 150,
        clientY: 250,
      });
      div.dispatchEvent(mouseEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because clientX/clientY are not extracted yet
      expect(state.get('clientX')).toBe(150);
      expect(state.get('clientY')).toBe(250);
    });

    it('should extract pageX/pageY from mousemove event', async () => {
      // Arrange
      const state = createStateStore({
        pageX: { type: 'number', initial: 0 },
        pageY: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleMousemove',
        steps: [
          { do: 'set', target: 'pageX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'pageX' } },
          { do: 'set', target: 'pageY', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'pageY' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'mousemove-div' },
          onMousemove: {
            event: 'mousemove',
            action: 'handleMousemove',
            payload: {
              pageX: { expr: 'var', name: 'pageX' },
              pageY: { expr: 'var', name: 'pageY' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleMousemove: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#mousemove-div') as HTMLDivElement;
      // Note: In jsdom, pageX/pageY are derived from clientX/clientY
      // so we use clientX/clientY to set the desired page coordinates
      const mouseEvent = createMouseEvent('mousemove', {
        clientX: 300,
        clientY: 400,
      });
      div.dispatchEvent(mouseEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - pageX/pageY should equal clientX/clientY in jsdom
      expect(state.get('pageX')).toBe(300);
      expect(state.get('pageY')).toBe(400);
    });

    it('should extract button from mousedown event', async () => {
      // Arrange
      const state = createStateStore({
        button: { type: 'number', initial: -1 },
      });

      const captureAction: CompiledAction = {
        name: 'handleMousedown',
        steps: [
          { do: 'set', target: 'button', value: { expr: 'var', name: 'payload' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'mousedown-div' },
          onMousedown: {
            event: 'mousedown',
            action: 'handleMousedown',
            payload: { expr: 'var', name: 'button' },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleMousedown: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#mousedown-div') as HTMLDivElement;
      
      // Test right click (button = 2)
      const mouseEvent = createMouseEvent('mousedown', {
        button: 2,
      });
      div.dispatchEvent(mouseEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because button is not extracted yet
      expect(state.get('button')).toBe(2);
    });

    it('should pass all mouse data through payload expression', async () => {
      // Arrange
      const state = createStateStore({
        clientX: { type: 'number', initial: 0 },
        clientY: { type: 'number', initial: 0 },
        pageX: { type: 'number', initial: 0 },
        pageY: { type: 'number', initial: 0 },
        button: { type: 'number', initial: -1 },
      });

      const captureAction: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'set', target: 'clientX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'clientX' } },
          { do: 'set', target: 'clientY', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'clientY' } },
          { do: 'set', target: 'pageX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'pageX' } },
          { do: 'set', target: 'pageY', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'pageY' } },
          { do: 'set', target: 'button', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'button' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'full-mouse-div' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            payload: {
              clientX: { expr: 'var', name: 'clientX' },
              clientY: { expr: 'var', name: 'clientY' },
              pageX: { expr: 'var', name: 'pageX' },
              pageY: { expr: 'var', name: 'pageY' },
              button: { expr: 'var', name: 'button' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#full-mouse-div') as HTMLDivElement;
      // Note: In jsdom, pageX/pageY are derived from clientX/clientY
      const mouseEvent = createMouseEvent('click', {
        clientX: 100,
        clientY: 200,
        button: 0,
      });
      div.dispatchEvent(mouseEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - All mouse data should be extracted
      // Note: In jsdom, pageX/pageY equal clientX/clientY
      expect(state.get('clientX')).toBe(100);
      expect(state.get('clientY')).toBe(200);
      expect(state.get('pageX')).toBe(100);
      expect(state.get('pageY')).toBe(200);
      expect(state.get('button')).toBe(0);
    });
  });

  // ==================== TouchEvent Tests ====================

  describe('TouchEvent data extraction', () => {
    it('should extract touches array from touchstart event', async () => {
      // Arrange
      const state = createStateStore({
        touchCount: { type: 'number', initial: 0 },
        firstTouchX: { type: 'number', initial: 0 },
        firstTouchY: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleTouchstart',
        steps: [
          { do: 'set', target: 'touchCount', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'touchCount' } },
          { do: 'set', target: 'firstTouchX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'firstTouchX' } },
          { do: 'set', target: 'firstTouchY', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'firstTouchY' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'touch-div' },
          onTouchstart: {
            event: 'touchstart',
            action: 'handleTouchstart',
            payload: {
              touchCount: {
                expr: 'get',
                base: { expr: 'var', name: 'touches' },
                path: 'length',
              },
              firstTouchX: {
                expr: 'get',
                base: {
                  expr: 'get',
                  base: { expr: 'var', name: 'touches' },
                  path: '0',
                },
                path: 'clientX',
              },
              firstTouchY: {
                expr: 'get',
                base: {
                  expr: 'get',
                  base: { expr: 'var', name: 'touches' },
                  path: '0',
                },
                path: 'clientY',
              },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleTouchstart: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#touch-div') as HTMLDivElement;
      
      const touch1 = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 150,
        pageX: 100,
        pageY: 150,
        target: div,
      });
      const touch2 = createTouch({
        identifier: 1,
        clientX: 200,
        clientY: 250,
        pageX: 200,
        pageY: 250,
        target: div,
      });

      const touchEvent = createTouchEvent('touchstart', div, [touch1, touch2], [touch1, touch2]);
      div.dispatchEvent(touchEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because touches are not extracted yet
      expect(state.get('touchCount')).toBe(2);
      expect(state.get('firstTouchX')).toBe(100);
      expect(state.get('firstTouchY')).toBe(150);
    });

    it('should extract changedTouches from touchend event', async () => {
      // Arrange
      const state = createStateStore({
        changedCount: { type: 'number', initial: 0 },
        changedX: { type: 'number', initial: 0 },
        changedY: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleTouchend',
        steps: [
          { do: 'set', target: 'changedCount', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'changedCount' } },
          { do: 'set', target: 'changedX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'changedX' } },
          { do: 'set', target: 'changedY', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'changedY' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'touchend-div' },
          onTouchend: {
            event: 'touchend',
            action: 'handleTouchend',
            payload: {
              changedCount: {
                expr: 'get',
                base: { expr: 'var', name: 'changedTouches' },
                path: 'length',
              },
              changedX: {
                expr: 'get',
                base: {
                  expr: 'get',
                  base: { expr: 'var', name: 'changedTouches' },
                  path: '0',
                },
                path: 'clientX',
              },
              changedY: {
                expr: 'get',
                base: {
                  expr: 'get',
                  base: { expr: 'var', name: 'changedTouches' },
                  path: '0',
                },
                path: 'clientY',
              },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleTouchend: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#touchend-div') as HTMLDivElement;
      
      const changedTouch = createTouch({
        identifier: 0,
        clientX: 300,
        clientY: 400,
        pageX: 350,
        pageY: 450,
        target: div,
      });

      // touchend: touches is empty (finger lifted), changedTouches has the lifted finger
      const touchEvent = createTouchEvent('touchend', div, [], [changedTouch]);
      div.dispatchEvent(touchEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because changedTouches are not extracted yet
      expect(state.get('changedCount')).toBe(1);
      expect(state.get('changedX')).toBe(300);
      expect(state.get('changedY')).toBe(400);
    });

    it('should extract touch with pageX/pageY coordinates', async () => {
      // Arrange
      const state = createStateStore({
        pageX: { type: 'number', initial: 0 },
        pageY: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleTouchmove',
        steps: [
          { do: 'set', target: 'pageX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'pageX' } },
          { do: 'set', target: 'pageY', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'pageY' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'touchmove-div' },
          onTouchmove: {
            event: 'touchmove',
            action: 'handleTouchmove',
            payload: {
              pageX: {
                expr: 'get',
                base: {
                  expr: 'get',
                  base: { expr: 'var', name: 'touches' },
                  path: '0',
                },
                path: 'pageX',
              },
              pageY: {
                expr: 'get',
                base: {
                  expr: 'get',
                  base: { expr: 'var', name: 'touches' },
                  path: '0',
                },
                path: 'pageY',
              },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleTouchmove: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#touchmove-div') as HTMLDivElement;
      
      const touch = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 150,
        pageX: 200,
        pageY: 250,
        target: div,
      });

      const touchEvent = createTouchEvent('touchmove', div, [touch], [touch]);
      div.dispatchEvent(touchEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because touches pageX/pageY are not extracted yet
      expect(state.get('pageX')).toBe(200);
      expect(state.get('pageY')).toBe(250);
    });
  });

  // ==================== Scroll Event Tests ====================

  describe('Scroll event data extraction', () => {
    it('should extract scrollTop/scrollLeft from scroll event', async () => {
      // Arrange
      const state = createStateStore({
        scrollTop: { type: 'number', initial: 0 },
        scrollLeft: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleScroll',
        steps: [
          { do: 'set', target: 'scrollTop', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'scrollTop' } },
          { do: 'set', target: 'scrollLeft', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'scrollLeft' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'scroll-div' },
          style: { expr: 'lit', value: 'overflow: auto; height: 100px; width: 100px;' },
          onScroll: {
            event: 'scroll',
            action: 'handleScroll',
            payload: {
              scrollTop: { expr: 'var', name: 'scrollTop' },
              scrollLeft: { expr: 'var', name: 'scrollLeft' },
            },
          },
        },
        children: [
          {
            kind: 'element',
            tag: 'div',
            props: {
              style: { expr: 'lit', value: 'height: 500px; width: 500px;' },
            },
          },
        ],
      };

      const ctx = createRenderContext({
        state,
        actions: { handleScroll: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#scroll-div') as HTMLDivElement;
      
      // Simulate scroll position
      div.scrollTop = 150;
      div.scrollLeft = 75;
      
      // Dispatch scroll event
      const scrollEvent = new Event('scroll', { bubbles: true });
      div.dispatchEvent(scrollEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because scrollTop/scrollLeft are not extracted yet
      expect(state.get('scrollTop')).toBe(150);
      expect(state.get('scrollLeft')).toBe(75);
    });

    it('should work on scrollable div element with vertical scroll only', async () => {
      // Arrange
      const state = createStateStore({
        scrollTop: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleScroll',
        steps: [
          { do: 'set', target: 'scrollTop', value: { expr: 'var', name: 'payload' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'vertical-scroll-div' },
          style: { expr: 'lit', value: 'overflow-y: auto; height: 50px;' },
          onScroll: {
            event: 'scroll',
            action: 'handleScroll',
            payload: { expr: 'var', name: 'scrollTop' },
          },
        },
        children: [
          {
            kind: 'element',
            tag: 'div',
            props: {
              style: { expr: 'lit', value: 'height: 300px;' },
            },
          },
        ],
      };

      const ctx = createRenderContext({
        state,
        actions: { handleScroll: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#vertical-scroll-div') as HTMLDivElement;
      div.scrollTop = 200;
      
      const scrollEvent = new Event('scroll', { bubbles: true });
      div.dispatchEvent(scrollEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Should FAIL because scrollTop is not extracted yet
      expect(state.get('scrollTop')).toBe(200);
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration with existing value/checked extraction', () => {
    it('should combine keyboard event data with input value', async () => {
      // Arrange
      const state = createStateStore({
        value: { type: 'string', initial: '' },
        key: { type: 'string', initial: '' },
      });

      const captureAction: CompiledAction = {
        name: 'handleKeydown',
        steps: [
          { do: 'set', target: 'value', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'value' } },
          { do: 'set', target: 'key', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'key' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'combined-input' },
          onKeydown: {
            event: 'keydown',
            action: 'handleKeydown',
            payload: {
              value: { expr: 'var', name: 'value' },
              key: { expr: 'var', name: 'key' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleKeydown: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#combined-input') as HTMLInputElement;
      input.value = 'Hello';
      
      const keyEvent = createKeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
      });
      input.dispatchEvent(keyEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Both value and key should be available
      expect(state.get('value')).toBe('Hello');
      expect(state.get('key')).toBe('Enter');
    });

    it('should combine mouse event data with checkbox checked state', async () => {
      // Arrange
      const state = createStateStore({
        checked: { type: 'boolean', initial: false },
        clientX: { type: 'number', initial: 0 },
      });

      const captureAction: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'set', target: 'checked', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'checked' } },
          { do: 'set', target: 'clientX', value: { expr: 'get', base: { expr: 'var', name: 'payload' }, path: 'clientX' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'checkbox' },
          id: { expr: 'lit', value: 'combined-checkbox' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            payload: {
              checked: { expr: 'var', name: 'checked' },
              clientX: { expr: 'var', name: 'clientX' },
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const checkbox = container.querySelector('#combined-checkbox') as HTMLInputElement;
      // Note: In jsdom, dispatching a click event on checkbox toggles checked state
      // checkbox starts as false, so after click it becomes true
      checkbox.checked = false;

      const mouseEvent = createMouseEvent('click', {
        clientX: 50,
      });
      checkbox.dispatchEvent(mouseEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Both checked and clientX should be available
      // After click event, jsdom toggles checked from false to true
      expect(state.get('checked')).toBe(true);
      expect(state.get('clientX')).toBe(50);
    });

    it('should access event data via var expressions in payload', async () => {
      // Arrange
      const state = createStateStore({
        position: { type: 'string', initial: '' },
      });

      const captureAction: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'set', target: 'position', value: { expr: 'var', name: 'payload' } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'position-div' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            payload: {
              expr: 'concat',
              items: [
                { expr: 'var', name: 'clientX' },
                { expr: 'lit', value: ',' },
                { expr: 'var', name: 'clientY' },
              ],
            },
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#position-div') as HTMLDivElement;
      const mouseEvent = createMouseEvent('click', {
        clientX: 123,
        clientY: 456,
      });
      div.dispatchEvent(mouseEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Concatenated position should be "123,456"
      expect(state.get('position')).toBe('123,456');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle event without corresponding extraction gracefully', async () => {
      // Arrange - focus event doesn't have special extraction
      const state = createStateStore({
        focused: { type: 'boolean', initial: false },
      });

      const captureAction: CompiledAction = {
        name: 'handleFocus',
        steps: [
          { do: 'set', target: 'focused', value: { expr: 'lit', value: true } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'input',
        props: {
          id: { expr: 'lit', value: 'focus-input' },
          onFocus: {
            event: 'focus',
            action: 'handleFocus',
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleFocus: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const input = container.querySelector('#focus-input') as HTMLInputElement;
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Action should execute without errors
      expect(state.get('focused')).toBe(true);
    });

    it('should handle missing payload expression gracefully', async () => {
      // Arrange - No payload but event data should still be extracted
      const state = createStateStore({
        clicked: { type: 'boolean', initial: false },
      });

      const captureAction: CompiledAction = {
        name: 'handleClick',
        steps: [
          { do: 'set', target: 'clicked', value: { expr: 'lit', value: true } },
        ],
      };

      const node: CompiledNode = {
        kind: 'element',
        tag: 'div',
        props: {
          id: { expr: 'lit', value: 'no-payload-div' },
          onClick: {
            event: 'click',
            action: 'handleClick',
            // No payload
          },
        },
      };

      const ctx = createRenderContext({
        state,
        actions: { handleClick: captureAction },
      });

      // Act
      const result = render(node, ctx);
      container.appendChild(result);

      const div = container.querySelector('#no-payload-div') as HTMLDivElement;
      const mouseEvent = createMouseEvent('click', { clientX: 100, clientY: 200 });
      div.dispatchEvent(mouseEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - Action should execute successfully
      expect(state.get('clicked')).toBe(true);
    });
  });
});
