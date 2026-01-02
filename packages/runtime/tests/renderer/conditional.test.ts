/**
 * Test module for Conditional (if) Node Rendering.
 *
 * Coverage:
 * - if node renders then branch when true
 * - if node renders else branch when false
 * - if node switches branches on state change
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledIfNode, CompiledAction } from '@constela/compiler';

describe('render if node', () => {
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

  // ==================== Then Branch Rendering ====================

  describe('then branch rendering', () => {
    it('should render then branch when condition is true', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: true },
        then: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'then-branch' } },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      const thenElement = container.querySelector('.then-branch');
      expect(thenElement).not.toBeNull();
    });

    it('should render then branch when state condition is truthy', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'isVisible' },
        then: {
          kind: 'element',
          tag: 'span',
          props: { id: { expr: 'lit', value: 'visible-content' } },
        },
      };
      const context = createContext({
        isVisible: { type: 'number', initial: 1 },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.querySelector('#visible-content')).not.toBeNull();
    });

    it('should render text node in then branch', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: true },
        then: {
          kind: 'text',
          value: { expr: 'lit', value: 'Condition is true!' },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.textContent).toContain('Condition is true!');
    });

    it('should render nested elements in then branch', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: true },
        then: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'element', tag: 'p', children: [{ kind: 'text', value: { expr: 'lit', value: 'Nested' } }] },
          ],
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.querySelector('p')?.textContent).toBe('Nested');
    });
  });

  // ==================== Else Branch Rendering ====================

  describe('else branch rendering', () => {
    it('should render else branch when condition is false', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: false },
        then: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'then-branch' } },
        },
        else: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'else-branch' } },
        },
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.querySelector('.then-branch')).toBeNull();
      expect(container.querySelector('.else-branch')).not.toBeNull();
    });

    it('should render else branch when state condition is falsy', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'isLoggedIn' },
        then: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Welcome!' } }],
        },
        else: {
          kind: 'element',
          tag: 'span',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Please log in' } }],
        },
      };
      const context = createContext({
        isLoggedIn: { type: 'number', initial: 0 },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.textContent).toContain('Please log in');
      expect(container.textContent).not.toContain('Welcome!');
    });

    it('should render nothing when condition is false and no else branch', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: false },
        then: {
          kind: 'element',
          tag: 'div',
          props: { className: { expr: 'lit', value: 'then-branch' } },
        },
        // No else branch
      };
      const context = createContext();

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert - should render a placeholder (comment node) or nothing
      expect(container.querySelector('.then-branch')).toBeNull();
    });
  });

  // ==================== Computed Conditions ====================

  describe('computed conditions', () => {
    it('should evaluate comparison expression', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: {
          expr: 'bin',
          op: '>',
          left: { expr: 'state', name: 'count' },
          right: { expr: 'lit', value: 5 },
        },
        then: { kind: 'text', value: { expr: 'lit', value: 'Greater than 5' } },
        else: { kind: 'text', value: { expr: 'lit', value: '5 or less' } },
      };

      // Test with count = 10
      const contextGreater = createContext({
        count: { type: 'number', initial: 10 },
      });
      const resultGreater = render(node, contextGreater);
      container.appendChild(resultGreater);
      expect(container.textContent).toContain('Greater than 5');

      // Clean up
      container.innerHTML = '';

      // Test with count = 3
      const contextLess = createContext({
        count: { type: 'number', initial: 3 },
      });
      const resultLess = render(node, contextLess);
      container.appendChild(resultLess);
      expect(container.textContent).toContain('5 or less');
    });

    it('should evaluate equality expression', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: {
          expr: 'bin',
          op: '==',
          left: { expr: 'state', name: 'status' },
          right: { expr: 'lit', value: 'active' },
        },
        then: { kind: 'text', value: { expr: 'lit', value: 'Active' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Inactive' } },
      };

      const context = createContext({
        status: { type: 'string', initial: 'active' },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.textContent).toContain('Active');
    });

    it('should evaluate logical AND expression', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: {
          expr: 'bin',
          op: '&&',
          left: { expr: 'state', name: 'isLoggedIn' },
          right: { expr: 'state', name: 'hasPermission' },
        },
        then: { kind: 'text', value: { expr: 'lit', value: 'Access granted' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Access denied' } },
      };

      // Both true
      const contextBothTrue = createContext({
        isLoggedIn: { type: 'number', initial: 1 },
        hasPermission: { type: 'number', initial: 1 },
      });
      const resultBothTrue = render(node, contextBothTrue);
      container.appendChild(resultBothTrue);
      expect(container.textContent).toContain('Access granted');

      container.innerHTML = '';

      // One false
      const contextOneFalse = createContext({
        isLoggedIn: { type: 'number', initial: 1 },
        hasPermission: { type: 'number', initial: 0 },
      });
      const resultOneFalse = render(node, contextOneFalse);
      container.appendChild(resultOneFalse);
      expect(container.textContent).toContain('Access denied');
    });

    it('should evaluate NOT expression', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: {
          expr: 'not',
          operand: { expr: 'state', name: 'isLoading' },
        },
        then: { kind: 'text', value: { expr: 'lit', value: 'Content loaded' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
      };

      // isLoading = false (not loading)
      const contextNotLoading = createContext({
        isLoading: { type: 'number', initial: 0 },
      });
      const resultNotLoading = render(node, contextNotLoading);
      container.appendChild(resultNotLoading);
      expect(container.textContent).toContain('Content loaded');

      container.innerHTML = '';

      // isLoading = true (still loading)
      const contextLoading = createContext({
        isLoading: { type: 'number', initial: 1 },
      });
      const resultLoading = render(node, contextLoading);
      container.appendChild(resultLoading);
      expect(container.textContent).toContain('Loading...');
    });
  });

  // ==================== Reactive Branch Switching ====================

  describe('reactive branch switching', () => {
    it('should switch from then to else when condition becomes false', async () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'showContent' },
        then: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'content' } },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Content visible' } }],
        },
        else: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'placeholder' } },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Content hidden' } }],
        },
      };
      const context = createContext({
        showContent: { type: 'number', initial: 1 },
      });

      // Act - initial render
      const result = render(node, context);
      container.appendChild(result);

      expect(container.querySelector('#content')).not.toBeNull();
      expect(container.textContent).toContain('Content visible');

      // Change state to hide content
      context.state.set('showContent', 0);

      // Wait for reactivity
      await Promise.resolve();

      // Assert - should now show else branch
      expect(container.querySelector('#content')).toBeNull();
      expect(container.querySelector('#placeholder')).not.toBeNull();
      expect(container.textContent).toContain('Content hidden');
    });

    it('should switch from else to then when condition becomes true', async () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'isReady' },
        then: { kind: 'text', value: { expr: 'lit', value: 'Ready!' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Not ready' } },
      };
      const context = createContext({
        isReady: { type: 'number', initial: 0 },
      });

      // Act - initial render (else branch)
      const result = render(node, context);
      container.appendChild(result);

      expect(container.textContent).toContain('Not ready');

      // Change state to ready
      context.state.set('isReady', 1);

      // Wait for reactivity
      await Promise.resolve();

      // Assert - should now show then branch
      expect(container.textContent).toContain('Ready!');
      expect(container.textContent).not.toContain('Not ready');
    });

    it('should handle multiple branch switches', async () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'toggle' },
        then: { kind: 'text', value: { expr: 'lit', value: 'ON' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'OFF' } },
      };
      const context = createContext({
        toggle: { type: 'number', initial: 1 },
      });

      // Act - initial render
      const result = render(node, context);
      container.appendChild(result);
      expect(container.textContent).toContain('ON');

      // Toggle off
      context.state.set('toggle', 0);
      await Promise.resolve();
      expect(container.textContent).toContain('OFF');

      // Toggle on
      context.state.set('toggle', 1);
      await Promise.resolve();
      expect(container.textContent).toContain('ON');

      // Toggle off again
      context.state.set('toggle', 0);
      await Promise.resolve();
      expect(container.textContent).toContain('OFF');
    });

    it('should update when computed condition changes', async () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: {
          expr: 'bin',
          op: '>',
          left: { expr: 'state', name: 'score' },
          right: { expr: 'lit', value: 50 },
        },
        then: { kind: 'text', value: { expr: 'lit', value: 'Pass' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Fail' } },
      };
      const context = createContext({
        score: { type: 'number', initial: 40 },
      });

      // Act - initial render (score = 40, fails)
      const result = render(node, context);
      container.appendChild(result);
      expect(container.textContent).toContain('Fail');

      // Update score to 60 (passes)
      context.state.set('score', 60);
      await Promise.resolve();
      expect(container.textContent).toContain('Pass');

      // Update score to 50 (exactly at threshold, still fails)
      context.state.set('score', 50);
      await Promise.resolve();
      expect(container.textContent).toContain('Fail');

      // Update score to 51 (passes)
      context.state.set('score', 51);
      await Promise.resolve();
      expect(container.textContent).toContain('Pass');
    });
  });

  // ==================== Nested If Nodes ====================

  describe('nested if nodes', () => {
    it('should handle nested if nodes in then branch', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'level1' },
        then: {
          kind: 'if',
          condition: { expr: 'state', name: 'level2' },
          then: { kind: 'text', value: { expr: 'lit', value: 'Both true' } },
          else: { kind: 'text', value: { expr: 'lit', value: 'Level1 true, Level2 false' } },
        },
        else: { kind: 'text', value: { expr: 'lit', value: 'Level1 false' } },
      };
      const context = createContext({
        level1: { type: 'number', initial: 1 },
        level2: { type: 'number', initial: 1 },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.textContent).toContain('Both true');
    });

    it('should handle if node in else branch', () => {
      // Arrange
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'isAdmin' },
        then: { kind: 'text', value: { expr: 'lit', value: 'Admin' } },
        else: {
          kind: 'if',
          condition: { expr: 'state', name: 'isMember' },
          then: { kind: 'text', value: { expr: 'lit', value: 'Member' } },
          else: { kind: 'text', value: { expr: 'lit', value: 'Guest' } },
        },
      };
      const context = createContext({
        isAdmin: { type: 'number', initial: 0 },
        isMember: { type: 'number', initial: 1 },
      });

      // Act
      const result = render(node, context);
      container.appendChild(result);

      // Assert
      expect(container.textContent).toContain('Member');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle falsy but not false conditions', () => {
      // Test with empty string
      const nodeEmptyString: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: '' },
        then: { kind: 'text', value: { expr: 'lit', value: 'True' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'False' } },
      };
      const context = createContext();

      const result = render(nodeEmptyString, context);
      container.appendChild(result);
      expect(container.textContent).toContain('False');
    });

    it('should handle truthy but not true conditions', () => {
      // Test with non-zero number
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: 42 },
        then: { kind: 'text', value: { expr: 'lit', value: 'Truthy' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'Falsy' } },
      };
      const context = createContext();

      const result = render(node, context);
      container.appendChild(result);
      expect(container.textContent).toContain('Truthy');
    });

    it('should handle null condition', () => {
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: null },
        then: { kind: 'text', value: { expr: 'lit', value: 'True' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'False' } },
      };
      const context = createContext();

      const result = render(node, context);
      container.appendChild(result);
      expect(container.textContent).toContain('False');
    });

    it('should handle zero condition', () => {
      const node: CompiledIfNode = {
        kind: 'if',
        condition: { expr: 'lit', value: 0 },
        then: { kind: 'text', value: { expr: 'lit', value: 'True' } },
        else: { kind: 'text', value: { expr: 'lit', value: 'False' } },
      };
      const context = createContext();

      const result = render(node, context);
      container.appendChild(result);
      expect(container.textContent).toContain('False');
    });
  });
});
