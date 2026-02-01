/**
 * Test module for Island Types (Islands Architecture).
 *
 * Coverage:
 * - IslandStrategy type values
 * - IslandStrategyOptions type structure
 * - IslandNode type structure
 * - Type guards: isIslandStrategy, isIslandStrategyOptions, isIslandNode
 * - ViewNode union includes IslandNode
 * - ISLAND_STRATEGIES constant array
 *
 * TDD Red Phase: These tests verify the Island types
 * that will be added to support Islands Architecture in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type {
  IslandStrategy,
  IslandStrategyOptions,
  IslandNode,
  ViewNode,
  StateField,
  ActionDefinition,
} from '../ast.js';
import {
  isIslandStrategy,
  isIslandStrategyOptions,
  isIslandNode,
  isViewNode,
  ISLAND_STRATEGIES,
} from '../island.js';

// ==================== ISLAND_STRATEGIES Constant ====================

describe('ISLAND_STRATEGIES', () => {
  describe('constant array', () => {
    it('should export ISLAND_STRATEGIES as a readonly array', () => {
      // Assert
      expect(ISLAND_STRATEGIES).toBeDefined();
      expect(Array.isArray(ISLAND_STRATEGIES)).toBe(true);
    });

    it('should contain all 6 strategy values', () => {
      // Assert
      expect(ISLAND_STRATEGIES).toHaveLength(6);
    });

    it('should include "load" strategy', () => {
      expect(ISLAND_STRATEGIES).toContain('load');
    });

    it('should include "idle" strategy', () => {
      expect(ISLAND_STRATEGIES).toContain('idle');
    });

    it('should include "visible" strategy', () => {
      expect(ISLAND_STRATEGIES).toContain('visible');
    });

    it('should include "interaction" strategy', () => {
      expect(ISLAND_STRATEGIES).toContain('interaction');
    });

    it('should include "media" strategy', () => {
      expect(ISLAND_STRATEGIES).toContain('media');
    });

    it('should include "never" strategy', () => {
      expect(ISLAND_STRATEGIES).toContain('never');
    });
  });
});

// ==================== IslandStrategy Type ====================

describe('IslandStrategy', () => {
  describe('isIslandStrategy type guard', () => {
    it('should return true for "load" strategy', () => {
      // Assert
      expect(isIslandStrategy('load')).toBe(true);
    });

    it('should return true for "idle" strategy', () => {
      // Assert
      expect(isIslandStrategy('idle')).toBe(true);
    });

    it('should return true for "visible" strategy', () => {
      // Assert
      expect(isIslandStrategy('visible')).toBe(true);
    });

    it('should return true for "interaction" strategy', () => {
      // Assert
      expect(isIslandStrategy('interaction')).toBe(true);
    });

    it('should return true for "media" strategy', () => {
      // Assert
      expect(isIslandStrategy('media')).toBe(true);
    });

    it('should return true for "never" strategy', () => {
      // Assert
      expect(isIslandStrategy('never')).toBe(true);
    });

    it('should return false for invalid strategy string', () => {
      // Assert
      expect(isIslandStrategy('always')).toBe(false);
      expect(isIslandStrategy('hover')).toBe(false);
      expect(isIslandStrategy('click')).toBe(false);
      expect(isIslandStrategy('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isIslandStrategy(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isIslandStrategy(undefined)).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isIslandStrategy(0)).toBe(false);
      expect(isIslandStrategy(1)).toBe(false);
    });

    it('should return false for objects', () => {
      expect(isIslandStrategy({ strategy: 'load' })).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isIslandStrategy(['load'])).toBe(false);
    });

    it('should return false for booleans', () => {
      expect(isIslandStrategy(true)).toBe(false);
      expect(isIslandStrategy(false)).toBe(false);
    });
  });
});

// ==================== IslandStrategyOptions Type ====================

describe('IslandStrategyOptions', () => {
  describe('type structure', () => {
    it('should accept empty object (all options optional)', () => {
      // Arrange
      const options: IslandStrategyOptions = {};

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });

    it('should accept threshold option for visible strategy', () => {
      // Arrange
      const options: IslandStrategyOptions = {
        threshold: 0.5,
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });

    it('should accept rootMargin option for visible strategy', () => {
      // Arrange
      const options: IslandStrategyOptions = {
        rootMargin: '100px',
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });

    it('should accept both threshold and rootMargin for visible strategy', () => {
      // Arrange
      const options: IslandStrategyOptions = {
        threshold: 0.1,
        rootMargin: '50px 0px',
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });

    it('should accept media option for media strategy', () => {
      // Arrange
      const options: IslandStrategyOptions = {
        media: '(min-width: 768px)',
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });

    it('should accept timeout option for idle strategy', () => {
      // Arrange
      const options: IslandStrategyOptions = {
        timeout: 2000,
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });

    it('should accept all options together', () => {
      // Arrange
      const options: IslandStrategyOptions = {
        threshold: 0.5,
        rootMargin: '100px',
        media: '(min-width: 768px)',
        timeout: 2000,
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });
  });

  describe('isIslandStrategyOptions type guard', () => {
    it('should return true for valid options object', () => {
      // Arrange
      const options = {
        threshold: 0.5,
        rootMargin: '100px',
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(true);
    });

    it('should return true for empty object', () => {
      // Assert
      expect(isIslandStrategyOptions({})).toBe(true);
    });

    it('should return false for null', () => {
      expect(isIslandStrategyOptions(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isIslandStrategyOptions(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isIslandStrategyOptions('string')).toBe(false);
      expect(isIslandStrategyOptions(123)).toBe(false);
      expect(isIslandStrategyOptions(true)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isIslandStrategyOptions(['threshold', 0.5])).toBe(false);
    });

    it('should return false when threshold is not a number', () => {
      // Arrange
      const options = {
        threshold: '0.5',
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(false);
    });

    it('should return false when rootMargin is not a string', () => {
      // Arrange
      const options = {
        rootMargin: 100,
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(false);
    });

    it('should return false when media is not a string', () => {
      // Arrange
      const options = {
        media: 768,
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(false);
    });

    it('should return false when timeout is not a number', () => {
      // Arrange
      const options = {
        timeout: '2000',
      };

      // Assert
      expect(isIslandStrategyOptions(options)).toBe(false);
    });

    it('should validate threshold is between 0 and 1', () => {
      // Arrange
      const validOptions = { threshold: 0.5 };
      const zeroThreshold = { threshold: 0 };
      const oneThreshold = { threshold: 1 };
      const invalidLow = { threshold: -0.1 };
      const invalidHigh = { threshold: 1.5 };

      // Assert
      expect(isIslandStrategyOptions(validOptions)).toBe(true);
      expect(isIslandStrategyOptions(zeroThreshold)).toBe(true);
      expect(isIslandStrategyOptions(oneThreshold)).toBe(true);
      expect(isIslandStrategyOptions(invalidLow)).toBe(false);
      expect(isIslandStrategyOptions(invalidHigh)).toBe(false);
    });

    it('should validate timeout is positive', () => {
      // Arrange
      const validTimeout = { timeout: 1000 };
      const zeroTimeout = { timeout: 0 };
      const invalidTimeout = { timeout: -100 };

      // Assert
      expect(isIslandStrategyOptions(validTimeout)).toBe(true);
      expect(isIslandStrategyOptions(zeroTimeout)).toBe(true);
      expect(isIslandStrategyOptions(invalidTimeout)).toBe(false);
    });
  });
});

// ==================== IslandNode Type ====================

describe('IslandNode', () => {
  describe('type structure', () => {
    it('should have kind field set to "island"', () => {
      // Arrange
      const node = {
        kind: 'island',
        id: 'counter-island',
        strategy: 'visible',
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isIslandNode(node)).toBe(true);
    });

    it('should require id field as string', () => {
      // Arrange
      const validNode = {
        kind: 'island',
        id: 'my-island',
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
      };

      const invalidNode = {
        kind: 'island',
        // Missing id field
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isIslandNode(validNode)).toBe(true);
      expect(isIslandNode(invalidNode)).toBe(false);
    });

    it('should require strategy field as valid IslandStrategy', () => {
      // Arrange
      const validNode = {
        kind: 'island',
        id: 'my-island',
        strategy: 'idle',
        content: { kind: 'element', tag: 'div' },
      };

      const invalidNode = {
        kind: 'island',
        id: 'my-island',
        strategy: 'invalid-strategy',
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isIslandNode(validNode)).toBe(true);
      expect(isIslandNode(invalidNode)).toBe(false);
    });

    it('should require content field as ViewNode', () => {
      // Arrange
      const validNode = {
        kind: 'island',
        id: 'my-island',
        strategy: 'load',
        content: { kind: 'element', tag: 'button' },
      };

      const invalidNode = {
        kind: 'island',
        id: 'my-island',
        strategy: 'load',
        // Missing content field
      };

      // Assert
      expect(isIslandNode(validNode)).toBe(true);
      expect(isIslandNode(invalidNode)).toBe(false);
    });

    it('should accept optional strategyOptions field', () => {
      // Arrange
      const nodeWithOptions = {
        kind: 'island',
        id: 'my-island',
        strategy: 'visible',
        strategyOptions: {
          threshold: 0.5,
          rootMargin: '100px',
        },
        content: { kind: 'element', tag: 'div' },
      };

      const nodeWithoutOptions = {
        kind: 'island',
        id: 'my-island',
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isIslandNode(nodeWithOptions)).toBe(true);
      expect(isIslandNode(nodeWithoutOptions)).toBe(true);
    });

    it('should accept optional state field', () => {
      // Arrange
      const nodeWithState = {
        kind: 'island',
        id: 'counter-island',
        strategy: 'interaction',
        content: { kind: 'element', tag: 'button' },
        state: {
          count: { type: 'number', initial: 0 } as StateField,
        },
      };

      // Assert
      expect(isIslandNode(nodeWithState)).toBe(true);
    });

    it('should accept optional actions field', () => {
      // Arrange
      const nodeWithActions = {
        kind: 'island',
        id: 'counter-island',
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
        actions: [
          {
            name: 'increment',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          },
        ] as ActionDefinition[],
      };

      // Assert
      expect(isIslandNode(nodeWithActions)).toBe(true);
    });

    it('should accept all optional fields together', () => {
      // Arrange
      const fullNode = {
        kind: 'island',
        id: 'full-island',
        strategy: 'visible',
        strategyOptions: {
          threshold: 0.5,
        },
        content: {
          kind: 'element',
          tag: 'div',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'count' } },
          ],
        },
        state: {
          count: { type: 'number', initial: 0 } as StateField,
          label: { type: 'string', initial: 'Counter' } as StateField,
        },
        actions: [
          {
            name: 'increment',
            steps: [
              { do: 'update', target: 'count', operation: 'increment' },
            ],
          },
          {
            name: 'reset',
            steps: [
              { do: 'set', target: 'count', value: { expr: 'lit', value: 0 } },
            ],
          },
        ] as ActionDefinition[],
      };

      // Assert
      expect(isIslandNode(fullNode)).toBe(true);
    });
  });

  describe('isIslandNode type guard', () => {
    it('should return true for valid island node', () => {
      // Arrange
      const node = {
        kind: 'island',
        id: 'test-island',
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isIslandNode(node)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isIslandNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isIslandNode(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isIslandNode({})).toBe(false);
    });

    it('should return false for object with wrong kind', () => {
      const obj = {
        kind: 'element',
        tag: 'div',
      };
      expect(isIslandNode(obj)).toBe(false);
    });

    it('should return false when id is not a string', () => {
      const obj = {
        kind: 'island',
        id: 123,
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(obj)).toBe(false);
    });

    it('should return false when strategy is invalid', () => {
      const obj = {
        kind: 'island',
        id: 'my-island',
        strategy: 'hover',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(obj)).toBe(false);
    });

    it('should return false when content is not a valid ViewNode', () => {
      const obj = {
        kind: 'island',
        id: 'my-island',
        strategy: 'load',
        content: 'not a view node',
      };
      expect(isIslandNode(obj)).toBe(false);
    });

    it('should return false when strategyOptions is invalid', () => {
      const obj = {
        kind: 'island',
        id: 'my-island',
        strategy: 'visible',
        strategyOptions: 'invalid',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(obj)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isIslandNode('island')).toBe(false);
      expect(isIslandNode(123)).toBe(false);
      expect(isIslandNode(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isIslandNode(['island', 'load'])).toBe(false);
    });
  });

  describe('strategy-specific validation', () => {
    it('should accept load strategy without options', () => {
      const node = {
        kind: 'island',
        id: 'load-island',
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept idle strategy with timeout option', () => {
      const node = {
        kind: 'island',
        id: 'idle-island',
        strategy: 'idle',
        strategyOptions: { timeout: 2000 },
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept visible strategy with threshold and rootMargin', () => {
      const node = {
        kind: 'island',
        id: 'visible-island',
        strategy: 'visible',
        strategyOptions: {
          threshold: 0.5,
          rootMargin: '100px 0px',
        },
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept interaction strategy', () => {
      const node = {
        kind: 'island',
        id: 'interaction-island',
        strategy: 'interaction',
        content: { kind: 'element', tag: 'button' },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept media strategy with media query option', () => {
      const node = {
        kind: 'island',
        id: 'media-island',
        strategy: 'media',
        strategyOptions: { media: '(min-width: 768px)' },
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept never strategy for static islands', () => {
      const node = {
        kind: 'island',
        id: 'static-island',
        strategy: 'never',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isIslandNode(node)).toBe(true);
    });
  });

  describe('content validation', () => {
    it('should accept ElementNode as content', () => {
      const node = {
        kind: 'island',
        id: 'element-island',
        strategy: 'load',
        content: {
          kind: 'element',
          tag: 'div',
          props: {
            class: { expr: 'lit', value: 'island-content' },
          },
          children: [
            { kind: 'text', value: { expr: 'lit', value: 'Hello' } },
          ],
        },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept IfNode as content', () => {
      const node = {
        kind: 'island',
        id: 'if-island',
        strategy: 'load',
        content: {
          kind: 'if',
          condition: { expr: 'state', name: 'isVisible' },
          then: { kind: 'element', tag: 'div' },
        },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept EachNode as content', () => {
      const node = {
        kind: 'island',
        id: 'each-island',
        strategy: 'load',
        content: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: { kind: 'element', tag: 'li' },
        },
      };
      expect(isIslandNode(node)).toBe(true);
    });

    it('should accept ComponentNode as content', () => {
      const node = {
        kind: 'island',
        id: 'component-island',
        strategy: 'load',
        content: {
          kind: 'component',
          name: 'Counter',
          props: {
            initialValue: { expr: 'lit', value: 0 },
          },
        },
      };
      expect(isIslandNode(node)).toBe(true);
    });
  });
});

// ==================== ViewNode Union with IslandNode ====================

describe('ViewNode union with IslandNode', () => {
  describe('isViewNode includes IslandNode', () => {
    it('should recognize IslandNode as valid ViewNode', () => {
      // Arrange
      const islandNode = {
        kind: 'island',
        id: 'my-island',
        strategy: 'load',
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isViewNode(islandNode)).toBe(true);
    });

    it('should still recognize existing view node types', () => {
      // Arrange
      const elementNode = {
        kind: 'element',
        tag: 'div',
      };

      const textNode = {
        kind: 'text',
        value: { expr: 'lit', value: 'Hello' },
      };

      const ifNode = {
        kind: 'if',
        condition: { expr: 'state', name: 'show' },
        then: { kind: 'element', tag: 'div' },
      };

      const eachNode = {
        kind: 'each',
        items: { expr: 'state', name: 'items' },
        as: 'item',
        body: { kind: 'element', tag: 'li' },
      };

      const componentNode = {
        kind: 'component',
        name: 'MyComponent',
      };

      const slotNode = {
        kind: 'slot',
      };

      const markdownNode = {
        kind: 'markdown',
        content: { expr: 'lit', value: '# Title' },
      };

      const codeNode = {
        kind: 'code',
        language: { expr: 'lit', value: 'javascript' },
        content: { expr: 'lit', value: 'console.log("hello")' },
      };

      const portalNode = {
        kind: 'portal',
        target: 'body',
        children: [{ kind: 'element', tag: 'div' }],
      };

      // Assert
      expect(isViewNode(elementNode)).toBe(true);
      expect(isViewNode(textNode)).toBe(true);
      expect(isViewNode(ifNode)).toBe(true);
      expect(isViewNode(eachNode)).toBe(true);
      expect(isViewNode(componentNode)).toBe(true);
      expect(isViewNode(slotNode)).toBe(true);
      expect(isViewNode(markdownNode)).toBe(true);
      expect(isViewNode(codeNode)).toBe(true);
      expect(isViewNode(portalNode)).toBe(true);
    });
  });

  describe('TypeScript type compatibility', () => {
    it('should allow IslandNode in ViewNode array', () => {
      // This test verifies TypeScript compilation compatibility
      const nodes: ViewNode[] = [
        {
          kind: 'island',
          id: 'my-island',
          strategy: 'load',
          content: { kind: 'element', tag: 'div' },
        } as IslandNode,
      ];

      expect(nodes.length).toBe(1);
    });

    it('should allow mixed view nodes including IslandNode', () => {
      // This test verifies TypeScript compilation compatibility
      const nodes: ViewNode[] = [
        { kind: 'element', tag: 'header' },
        {
          kind: 'island',
          id: 'counter',
          strategy: 'visible',
          content: { kind: 'element', tag: 'div' },
          state: {
            count: { type: 'number', initial: 0 },
          },
        } as IslandNode,
        { kind: 'element', tag: 'footer' },
      ];

      expect(nodes.length).toBe(3);
    });

    it('should allow IslandNode as ElementNode child', () => {
      // This test verifies nested island support
      const parentNode = {
        kind: 'element',
        tag: 'main',
        children: [
          {
            kind: 'island',
            id: 'nested-island',
            strategy: 'idle',
            content: { kind: 'element', tag: 'section' },
          } as IslandNode,
        ] as ViewNode[],
      };

      expect(parentNode.children?.length).toBe(1);
    });

    it('should allow nested IslandNode in content', () => {
      // Arrange - islands can contain other islands (for composition)
      const outerIsland: IslandNode = {
        kind: 'island',
        id: 'outer-island',
        strategy: 'load',
        content: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'island',
              id: 'inner-island',
              strategy: 'visible',
              content: { kind: 'element', tag: 'span' },
            } as IslandNode,
          ],
        },
      };

      expect(outerIsland.content.kind).toBe('element');
    });
  });
});

// ==================== Re-exports from island.ts ====================

describe('island.ts module exports', () => {
  it('should re-export IslandStrategy type from ast.ts', () => {
    // This test ensures proper re-export - verified by TypeScript compilation
    const strategy: IslandStrategy = 'load';
    expect(strategy).toBe('load');
  });

  it('should re-export IslandStrategyOptions type from ast.ts', () => {
    // This test ensures proper re-export - verified by TypeScript compilation
    const options: IslandStrategyOptions = {
      threshold: 0.5,
    };
    expect(options.threshold).toBe(0.5);
  });

  it('should re-export IslandNode type from ast.ts', () => {
    // This test ensures proper re-export - verified by TypeScript compilation
    const node: IslandNode = {
      kind: 'island',
      id: 'test',
      strategy: 'load',
      content: { kind: 'element', tag: 'div' },
    };
    expect(node.kind).toBe('island');
  });
});

// ==================== Integration with Program ====================

describe('IslandNode in Program context', () => {
  it('should allow IslandNode in Program.view', () => {
    // This verifies that IslandNode can be used as the root view
    const view: ViewNode = {
      kind: 'island',
      id: 'root-island',
      strategy: 'load',
      content: { kind: 'element', tag: 'div' },
    };

    expect(view.kind).toBe('island');
  });

  it('should allow IslandNode within component definition', () => {
    // Islands can be used inside component definitions
    const componentView: ViewNode = {
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'text', value: { expr: 'lit', value: 'Static content' } },
        {
          kind: 'island',
          id: 'interactive-section',
          strategy: 'interaction',
          content: {
            kind: 'element',
            tag: 'button',
            props: {
              onclick: { event: 'click', action: 'handleClick' },
            },
          },
        } as IslandNode,
      ],
    };

    expect((componentView as { children?: ViewNode[] }).children?.length).toBe(2);
  });
});
