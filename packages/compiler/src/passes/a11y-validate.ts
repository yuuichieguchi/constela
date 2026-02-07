/**
 * Accessibility Validation Pass
 *
 * This module performs accessibility (a11y) checks on the validated AST
 * and returns warnings (not errors) for potential issues:
 *
 * - A11Y_IMG_NO_ALT: img elements missing alt attribute
 * - A11Y_BUTTON_NO_LABEL: buttons with no text content or aria-label
 * - A11Y_ANCHOR_NO_LABEL: anchors with no text content or aria-label
 * - A11Y_INPUT_NO_LABEL: form inputs without aria-label or aria-labelledby
 * - A11Y_HEADING_SKIP: heading level hierarchy violations
 * - A11Y_POSITIVE_TABINDEX: positive tabindex values
 * - A11Y_DUPLICATE_ID: duplicate literal id values
 */

import type {
  Program,
  ViewNode,
  ElementNode,
  Expression,
} from '@constela/core';
import {
  ConstelaError,
  createA11yImgNoAltError,
  createA11yButtonNoLabelError,
  createA11yAnchorNoLabelError,
  createA11yInputNoLabelError,
  createA11yHeadingSkipError,
  createA11yPositiveTabindexError,
  createA11yDuplicateIdError,
} from '@constela/core';

// ==================== Types ====================

interface A11yContext {
  readonly warnings: ConstelaError[];
  maxHeadingLevel: number;
  readonly seenIds: Set<string>;
}

// ==================== Heading Tag Detection ====================

/** Heading tag regex to extract level from h1-h6 */
const HEADING_RE = /^h([1-6])$/;

/**
 * Extracts heading level from a tag name.
 * Returns the level (1-6) if it's a heading tag, or 0 if not.
 */
function getHeadingLevel(tag: string): number {
  const match = HEADING_RE.exec(tag);
  return match ? Number(match[1]) : 0;
}

// ==================== Form Input Tags ====================

const FORM_INPUT_TAGS = new Set(['input', 'textarea', 'select']);

// ==================== Text Child Detection ====================

/**
 * Checks if an element has at least one TextNode child (any expression type).
 */
function hasTextChild(children: ViewNode[] | undefined): boolean {
  if (!children) return false;
  return children.some((child) => child.kind === 'text');
}

// ==================== Element Validation ====================

/**
 * Checks a11y rules specific to element nodes.
 */
function validateElementNode(
  node: ElementNode,
  path: string,
  ctx: A11yContext
): void {
  const { tag, props, children } = node;

  // A11Y_IMG_NO_ALT: img must have alt attribute
  if (tag === 'img') {
    if (!props || !('alt' in props)) {
      ctx.warnings.push(createA11yImgNoAltError(path));
    }
  }

  // A11Y_BUTTON_NO_LABEL: button must have text child or aria-label
  if (tag === 'button') {
    const hasAriaLabel = props != null && 'aria-label' in props;
    if (!hasAriaLabel && !hasTextChild(children)) {
      ctx.warnings.push(createA11yButtonNoLabelError(path));
    }
  }

  // A11Y_ANCHOR_NO_LABEL: anchor must have text child or aria-label
  if (tag === 'a') {
    const hasAriaLabel = props != null && 'aria-label' in props;
    if (!hasAriaLabel && !hasTextChild(children)) {
      ctx.warnings.push(createA11yAnchorNoLabelError(path));
    }
  }

  // A11Y_INPUT_NO_LABEL: form inputs need aria-label or aria-labelledby
  if (FORM_INPUT_TAGS.has(tag)) {
    const hasAriaLabel = props != null && 'aria-label' in props;
    const hasAriaLabelledby = props != null && 'aria-labelledby' in props;
    if (!hasAriaLabel && !hasAriaLabelledby) {
      ctx.warnings.push(createA11yInputNoLabelError(tag, path));
    }
  }

  // A11Y_HEADING_SKIP: check heading hierarchy
  const headingLevel = getHeadingLevel(tag);
  if (headingLevel > 0) {
    if (ctx.maxHeadingLevel > 0 && headingLevel > ctx.maxHeadingLevel + 1) {
      ctx.warnings.push(
        createA11yHeadingSkipError(headingLevel, ctx.maxHeadingLevel + 1, path)
      );
    }
    ctx.maxHeadingLevel = Math.max(ctx.maxHeadingLevel, headingLevel);
  }

  // A11Y_POSITIVE_TABINDEX: flag literal tabindex > 0
  if (props && 'tabindex' in props) {
    const tabindexExpr = props['tabindex'] as Expression | undefined;
    if (
      tabindexExpr &&
      tabindexExpr.expr === 'lit' &&
      typeof tabindexExpr.value === 'number' &&
      tabindexExpr.value > 0
    ) {
      ctx.warnings.push(
        createA11yPositiveTabindexError(tabindexExpr.value, path)
      );
    }
  }

  // A11Y_DUPLICATE_ID: check literal id values
  if (props && 'id' in props) {
    const idExpr = props['id'] as Expression | undefined;
    if (idExpr && idExpr.expr === 'lit' && typeof idExpr.value === 'string') {
      if (ctx.seenIds.has(idExpr.value)) {
        ctx.warnings.push(createA11yDuplicateIdError(idExpr.value, path));
      } else {
        ctx.seenIds.add(idExpr.value);
      }
    }
  }
}

// ==================== Recursive Tree Traversal ====================

/**
 * Recursively validates a ViewNode for accessibility issues.
 */
function validateNode(
  node: ViewNode,
  path: string,
  ctx: A11yContext
): void {
  switch (node.kind) {
    case 'element':
      validateElementNode(node, path, ctx);
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child) {
            validateNode(child, `${path}/children/${i}`, ctx);
          }
        }
      }
      break;

    case 'text':
      // Text nodes have no a11y concerns
      break;

    case 'if':
      validateNode(node.then, `${path}/then`, ctx);
      if (node.else) {
        validateNode(node.else, `${path}/else`, ctx);
      }
      break;

    case 'each':
      validateNode(node.body, `${path}/body`, ctx);
      break;

    case 'component':
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child) {
            validateNode(child, `${path}/children/${i}`, ctx);
          }
        }
      }
      break;

    case 'slot':
    case 'markdown':
    case 'code':
      // No a11y checks for these node types
      break;

    case 'portal':
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child) {
            validateNode(child, `${path}/children/${i}`, ctx);
          }
        }
      }
      break;

    case 'island':
      validateNode(node.content, `${path}/content`, ctx);
      break;

    case 'suspense':
      validateNode(node.fallback, `${path}/fallback`, ctx);
      validateNode(node.content, `${path}/content`, ctx);
      break;

    case 'errorBoundary':
      validateNode(node.fallback, `${path}/fallback`, ctx);
      validateNode(node.content, `${path}/content`, ctx);
      break;
  }
}

// ==================== Public API ====================

/**
 * Performs accessibility validation on a Program AST.
 *
 * Returns an array of ConstelaError instances with severity 'warning'.
 * These warnings do not block compilation.
 *
 * @param program - The validated Program AST
 * @returns Array of accessibility warnings
 */
export function validateA11y(program: Program): ConstelaError[] {
  const ctx: A11yContext = {
    warnings: [],
    maxHeadingLevel: 0,
    seenIds: new Set(),
  };

  validateNode(program.view, '/view', ctx);

  return ctx.warnings;
}
