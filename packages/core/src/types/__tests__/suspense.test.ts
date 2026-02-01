/**
 * Test module for Suspense and Error Boundary Types.
 *
 * Coverage:
 * - SuspenseNode type structure
 * - ErrorBoundaryNode type structure
 * - Type guards: isSuspenseNode, isErrorBoundaryNode
 * - ViewNode union includes SuspenseNode and ErrorBoundaryNode
 * - Validation of fallback and content fields
 *
 * TDD Red Phase: These tests verify the Suspense and Error Boundary types
 * that will be added to support advanced SSR features in Constela Framework.
 */

import { describe, it, expect } from 'vitest';

import type {
  SuspenseNode,
  ErrorBoundaryNode,
  ViewNode,
} from '../ast.js';
import {
  isSuspenseNode,
  isErrorBoundaryNode,
  isViewNode,
} from '../guards.js';

// ==================== SuspenseNode Type ====================

describe('SuspenseNode', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    /**
     * Given: A valid SuspenseNode with all required fields
     * When: Validating the type
     * Then: Should have kind 'suspense'
     */
    it('should have kind field set to "suspense"', () => {
      // Arrange
      const node: SuspenseNode = {
        kind: 'suspense',
        id: 'data-loader',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isSuspenseNode(node)).toBe(true);
      expect(node.kind).toBe('suspense');
    });

    /**
     * Given: A SuspenseNode with an id
     * When: Validating the structure
     * Then: Should require id as string
     */
    it('should require id field as string', () => {
      // Arrange
      const validNode: SuspenseNode = {
        kind: 'suspense',
        id: 'user-profile-suspense',
        fallback: { kind: 'element', tag: 'div' },
        content: { kind: 'element', tag: 'section' },
      };

      const invalidNode = {
        kind: 'suspense',
        // Missing id
        fallback: { kind: 'element', tag: 'div' },
        content: { kind: 'element', tag: 'section' },
      };

      // Assert
      expect(isSuspenseNode(validNode)).toBe(true);
      expect(isSuspenseNode(invalidNode)).toBe(false);
    });

    /**
     * Given: A SuspenseNode with a fallback
     * When: Validating the structure
     * Then: Should require fallback as ViewNode
     */
    it('should require fallback field as ViewNode', () => {
      // Arrange
      const nodeWithElementFallback: SuspenseNode = {
        kind: 'suspense',
        id: 'suspense-1',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'skeleton' } },
          children: [
            { kind: 'element', tag: 'span', props: { class: { expr: 'lit', value: 'spinner' } } },
          ],
        },
        content: { kind: 'element', tag: 'main' },
      };

      const nodeWithTextFallback: SuspenseNode = {
        kind: 'suspense',
        id: 'suspense-2',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isSuspenseNode(nodeWithElementFallback)).toBe(true);
      expect(isSuspenseNode(nodeWithTextFallback)).toBe(true);
    });

    /**
     * Given: A SuspenseNode with content
     * When: Validating the structure
     * Then: Should require content as ViewNode
     */
    it('should require content field as ViewNode', () => {
      // Arrange
      const validNode: SuspenseNode = {
        kind: 'suspense',
        id: 'content-suspense',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
        content: {
          kind: 'element',
          tag: 'article',
          children: [
            { kind: 'text', value: { expr: 'state', name: 'articleContent' } },
          ],
        },
      };

      const invalidNode = {
        kind: 'suspense',
        id: 'invalid',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
        // Missing content
      };

      // Assert
      expect(isSuspenseNode(validNode)).toBe(true);
      expect(isSuspenseNode(invalidNode)).toBe(false);
    });

    /**
     * Given: A SuspenseNode with complex nested content
     * When: Validating the structure
     * Then: Should accept nested ViewNodes
     */
    it('should accept complex nested content', () => {
      // Arrange
      const node: SuspenseNode = {
        kind: 'suspense',
        id: 'complex-suspense',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'loading-skeleton' } },
          children: [
            { kind: 'element', tag: 'div', props: { class: { expr: 'lit', value: 'skeleton-header' } } },
            { kind: 'element', tag: 'div', props: { class: { expr: 'lit', value: 'skeleton-body' } } },
          ],
        },
        content: {
          kind: 'each',
          items: { expr: 'state', name: 'posts' },
          as: 'post',
          body: {
            kind: 'element',
            tag: 'article',
            children: [
              { kind: 'text', value: { expr: 'var', name: 'post', path: 'title' } },
            ],
          },
        },
      };

      // Assert
      expect(isSuspenseNode(node)).toBe(true);
    });
  });

  // ==================== Type Guard ====================

  describe('isSuspenseNode type guard', () => {
    it('should return true for valid suspense node', () => {
      // Arrange
      const node = {
        kind: 'suspense',
        id: 'test-suspense',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isSuspenseNode(node)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isSuspenseNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSuspenseNode(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isSuspenseNode({})).toBe(false);
    });

    it('should return false for object with wrong kind', () => {
      const obj = {
        kind: 'element',
        tag: 'div',
      };
      expect(isSuspenseNode(obj)).toBe(false);
    });

    it('should return false when id is not a string', () => {
      const obj = {
        kind: 'suspense',
        id: 123,
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading' } },
        content: { kind: 'element', tag: 'div' },
      };
      expect(isSuspenseNode(obj)).toBe(false);
    });

    it('should return false when fallback is not a ViewNode', () => {
      const obj = {
        kind: 'suspense',
        id: 'test',
        fallback: 'Loading...',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isSuspenseNode(obj)).toBe(false);
    });

    it('should return false when content is not a ViewNode', () => {
      const obj = {
        kind: 'suspense',
        id: 'test',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading' } },
        content: 'content',
      };
      expect(isSuspenseNode(obj)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isSuspenseNode('suspense')).toBe(false);
      expect(isSuspenseNode(123)).toBe(false);
      expect(isSuspenseNode(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isSuspenseNode(['suspense'])).toBe(false);
    });
  });

  // ==================== ViewNode Union ====================

  describe('ViewNode union with SuspenseNode', () => {
    it('should recognize SuspenseNode as valid ViewNode', () => {
      // Arrange
      const suspenseNode = {
        kind: 'suspense',
        id: 'my-suspense',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isViewNode(suspenseNode)).toBe(true);
    });

    it('should allow SuspenseNode in ViewNode array', () => {
      // This test verifies TypeScript compilation compatibility
      const nodes: ViewNode[] = [
        { kind: 'element', tag: 'header' },
        {
          kind: 'suspense',
          id: 'content-loader',
          fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
          content: { kind: 'element', tag: 'main' },
        } as SuspenseNode,
        { kind: 'element', tag: 'footer' },
      ];

      expect(nodes.length).toBe(3);
    });

    it('should allow nested SuspenseNode in content', () => {
      // Arrange - Suspense can contain other suspense boundaries
      const outerSuspense: SuspenseNode = {
        kind: 'suspense',
        id: 'outer',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading outer...' } },
        content: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'suspense',
              id: 'inner',
              fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading inner...' } },
              content: { kind: 'element', tag: 'span' },
            } as SuspenseNode,
          ],
        },
      };

      expect(outerSuspense.content.kind).toBe('element');
    });
  });
});

// ==================== ErrorBoundaryNode Type ====================

describe('ErrorBoundaryNode', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    /**
     * Given: A valid ErrorBoundaryNode with all required fields
     * When: Validating the type
     * Then: Should have kind 'errorBoundary'
     */
    it('should have kind field set to "errorBoundary"', () => {
      // Arrange
      const node: ErrorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Something went wrong' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isErrorBoundaryNode(node)).toBe(true);
      expect(node.kind).toBe('errorBoundary');
    });

    /**
     * Given: An ErrorBoundaryNode with a fallback
     * When: Validating the structure
     * Then: Should require fallback as ViewNode
     */
    it('should require fallback field as ViewNode', () => {
      // Arrange
      const nodeWithElementFallback: ErrorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'error-container' } },
          children: [
            { kind: 'element', tag: 'h2', children: [{ kind: 'text', value: { expr: 'lit', value: 'Error' } }] },
            { kind: 'text', value: { expr: 'lit', value: 'Something went wrong. Please try again.' } },
          ],
        },
        content: { kind: 'element', tag: 'main' },
      };

      const nodeWithTextFallback: ErrorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error occurred' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isErrorBoundaryNode(nodeWithElementFallback)).toBe(true);
      expect(isErrorBoundaryNode(nodeWithTextFallback)).toBe(true);
    });

    /**
     * Given: An ErrorBoundaryNode with content
     * When: Validating the structure
     * Then: Should require content as ViewNode
     */
    it('should require content field as ViewNode', () => {
      // Arrange
      const validNode: ErrorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
        content: {
          kind: 'element',
          tag: 'section',
          children: [
            { kind: 'component', name: 'UserProfile' },
          ],
        },
      };

      const invalidNode = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
        // Missing content
      };

      // Assert
      expect(isErrorBoundaryNode(validNode)).toBe(true);
      expect(isErrorBoundaryNode(invalidNode)).toBe(false);
    });

    /**
     * Given: An ErrorBoundaryNode with complex error UI
     * When: Validating the structure
     * Then: Should accept complex fallback with retry button
     */
    it('should accept complex error UI with retry functionality', () => {
      // Arrange
      const node: ErrorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'error-boundary' } },
          children: [
            {
              kind: 'element',
              tag: 'h2',
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Oops! Something went wrong' } }],
            },
            {
              kind: 'element',
              tag: 'p',
              children: [{ kind: 'text', value: { expr: 'lit', value: 'We apologize for the inconvenience.' } }],
            },
            {
              kind: 'element',
              tag: 'button',
              props: {
                onclick: { event: 'click', action: 'retry' },
              },
              children: [{ kind: 'text', value: { expr: 'lit', value: 'Try Again' } }],
            },
          ],
        },
        content: {
          kind: 'each',
          items: { expr: 'state', name: 'items' },
          as: 'item',
          body: { kind: 'element', tag: 'li' },
        },
      };

      // Assert
      expect(isErrorBoundaryNode(node)).toBe(true);
    });
  });

  // ==================== Type Guard ====================

  describe('isErrorBoundaryNode type guard', () => {
    it('should return true for valid error boundary node', () => {
      // Arrange
      const node = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isErrorBoundaryNode(node)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isErrorBoundaryNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isErrorBoundaryNode(undefined)).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isErrorBoundaryNode({})).toBe(false);
    });

    it('should return false for object with wrong kind', () => {
      const obj = {
        kind: 'element',
        tag: 'div',
      };
      expect(isErrorBoundaryNode(obj)).toBe(false);
    });

    it('should return false when fallback is missing', () => {
      const obj = {
        kind: 'errorBoundary',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isErrorBoundaryNode(obj)).toBe(false);
    });

    it('should return false when content is missing', () => {
      const obj = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
      };
      expect(isErrorBoundaryNode(obj)).toBe(false);
    });

    it('should return false when fallback is not a ViewNode', () => {
      const obj = {
        kind: 'errorBoundary',
        fallback: 'Error message',
        content: { kind: 'element', tag: 'div' },
      };
      expect(isErrorBoundaryNode(obj)).toBe(false);
    });

    it('should return false when content is not a ViewNode', () => {
      const obj = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
        content: { invalid: true },
      };
      expect(isErrorBoundaryNode(obj)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isErrorBoundaryNode('errorBoundary')).toBe(false);
      expect(isErrorBoundaryNode(123)).toBe(false);
      expect(isErrorBoundaryNode(true)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isErrorBoundaryNode(['errorBoundary'])).toBe(false);
    });
  });

  // ==================== ViewNode Union ====================

  describe('ViewNode union with ErrorBoundaryNode', () => {
    it('should recognize ErrorBoundaryNode as valid ViewNode', () => {
      // Arrange
      const errorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
        content: { kind: 'element', tag: 'div' },
      };

      // Assert
      expect(isViewNode(errorBoundaryNode)).toBe(true);
    });

    it('should allow ErrorBoundaryNode in ViewNode array', () => {
      // This test verifies TypeScript compilation compatibility
      const nodes: ViewNode[] = [
        { kind: 'element', tag: 'header' },
        {
          kind: 'errorBoundary',
          fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
          content: { kind: 'element', tag: 'main' },
        } as ErrorBoundaryNode,
        { kind: 'element', tag: 'footer' },
      ];

      expect(nodes.length).toBe(3);
    });

    it('should allow nested ErrorBoundaryNode in content', () => {
      // Arrange - Error boundaries can contain other error boundaries
      const outerBoundary: ErrorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Outer error' } },
        content: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'errorBoundary',
              fallback: { kind: 'text', value: { expr: 'lit', value: 'Inner error' } },
              content: { kind: 'element', tag: 'span' },
            } as ErrorBoundaryNode,
          ],
        },
      };

      expect(outerBoundary.content.kind).toBe('element');
    });

    it('should allow ErrorBoundary wrapping Suspense', () => {
      // Arrange - Common pattern: ErrorBoundary around Suspense
      const wrappedNode: ErrorBoundaryNode = {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Failed to load' } },
        content: {
          kind: 'suspense',
          id: 'data-loader',
          fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
          content: { kind: 'element', tag: 'div' },
        } as SuspenseNode,
      };

      expect(wrappedNode.content.kind).toBe('suspense');
    });
  });
});

// ==================== Combined Patterns ====================

describe('Suspense and ErrorBoundary combined patterns', () => {
  it('should support ErrorBoundary wrapping Suspense pattern', () => {
    // Arrange - Best practice: wrap suspense with error boundary
    const pattern: ViewNode = {
      kind: 'errorBoundary',
      fallback: {
        kind: 'element',
        tag: 'div',
        props: { class: { expr: 'lit', value: 'error' } },
        children: [{ kind: 'text', value: { expr: 'lit', value: 'Failed to load data' } }],
      },
      content: {
        kind: 'suspense',
        id: 'async-data',
        fallback: {
          kind: 'element',
          tag: 'div',
          props: { class: { expr: 'lit', value: 'skeleton' } },
        },
        content: {
          kind: 'each',
          items: { expr: 'data', name: 'posts' },
          as: 'post',
          body: { kind: 'element', tag: 'article' },
        },
      } as SuspenseNode,
    } as ErrorBoundaryNode;

    expect(isViewNode(pattern)).toBe(true);
  });

  it('should support multiple suspense boundaries within error boundary', () => {
    // Arrange
    const pattern: ViewNode = {
      kind: 'errorBoundary',
      fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
      content: {
        kind: 'element',
        tag: 'div',
        children: [
          {
            kind: 'suspense',
            id: 'header-data',
            fallback: { kind: 'element', tag: 'div', props: { class: { expr: 'lit', value: 'header-skeleton' } } },
            content: { kind: 'component', name: 'Header' },
          } as SuspenseNode,
          {
            kind: 'suspense',
            id: 'content-data',
            fallback: { kind: 'element', tag: 'div', props: { class: { expr: 'lit', value: 'content-skeleton' } } },
            content: { kind: 'component', name: 'Content' },
          } as SuspenseNode,
        ],
      },
    } as ErrorBoundaryNode;

    expect(isViewNode(pattern)).toBe(true);
  });

  it('should support Suspense containing ErrorBoundary pattern', () => {
    // Arrange - Less common but valid pattern
    const pattern: ViewNode = {
      kind: 'suspense',
      id: 'outer-suspense',
      fallback: { kind: 'text', value: { expr: 'lit', value: 'Loading...' } },
      content: {
        kind: 'errorBoundary',
        fallback: { kind: 'text', value: { expr: 'lit', value: 'Error' } },
        content: { kind: 'element', tag: 'div' },
      } as ErrorBoundaryNode,
    } as SuspenseNode;

    expect(isViewNode(pattern)).toBe(true);
  });
});
