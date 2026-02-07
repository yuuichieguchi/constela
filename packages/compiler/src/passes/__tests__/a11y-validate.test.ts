/**
 * Test module for a11y validation pass (validateA11y).
 *
 * Coverage:
 * - A11Y_IMG_NO_ALT: img missing alt attribute
 * - A11Y_BUTTON_NO_LABEL: button with no text children and no aria-label
 * - A11Y_ANCHOR_NO_LABEL: anchor with no text children and no aria-label
 * - A11Y_INPUT_NO_LABEL: input/textarea/select without aria-label or aria-labelledby
 * - A11Y_HEADING_SKIP: heading level skips (e.g. h1 -> h3)
 * - A11Y_POSITIVE_TABINDEX: tabindex literal > 0
 * - A11Y_DUPLICATE_ID: duplicate literal id values
 * - Integration: multiple warnings, nested traversal, fully accessible component
 *
 * TDD Red Phase: These tests will FAIL because validateA11y does not exist yet.
 */

import { describe, it, expect } from 'vitest';
import { validateA11y } from '../a11y-validate.js';
import type { Program } from '@constela/core';

// ==================== Test Helpers ====================

/**
 * Creates a minimal Program AST wrapper for testing.
 * The view field accepts unknown to allow flexible AST node construction.
 */
function createProgram(view: unknown): Program {
  return {
    version: '1.0',
    state: {},
    actions: [],
    view,
  } as unknown as Program;
}

// ==================== A11Y_IMG_NO_ALT ====================

describe('validateA11y - A11Y_IMG_NO_ALT', () => {
  it('should warn when img has no alt prop', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'img',
      props: { src: { expr: 'lit', value: 'photo.jpg' } },
    });

    const warnings = validateA11y(program);

    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings.some((w) => w.code === 'A11Y_IMG_NO_ALT')).toBe(true);
    expect(warnings.find((w) => w.code === 'A11Y_IMG_NO_ALT')?.severity).toBe('warning');
  });

  it('should not warn when img has alt with text value', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'img',
      props: {
        src: { expr: 'lit', value: 'photo.jpg' },
        alt: { expr: 'lit', value: 'A photo' },
      },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_IMG_NO_ALT')).toBe(false);
  });

  it('should not warn when img has empty alt (decorative image)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'img',
      props: {
        src: { expr: 'lit', value: 'decoration.png' },
        alt: { expr: 'lit', value: '' },
      },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_IMG_NO_ALT')).toBe(false);
  });

  it('should not warn when img has dynamic alt expression', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'img',
      props: {
        src: { expr: 'lit', value: 'photo.jpg' },
        alt: { expr: 'state', name: 'altText' },
      },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_IMG_NO_ALT')).toBe(false);
  });

  it('should warn when img has props but no alt key at all', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'img',
      props: {
        src: { expr: 'lit', value: 'image.webp' },
        class: { expr: 'lit', value: 'hero-image' },
      },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_IMG_NO_ALT')).toBe(true);
  });

  it('should warn when img has no props at all', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'img',
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_IMG_NO_ALT')).toBe(true);
  });
});

// ==================== A11Y_BUTTON_NO_LABEL ====================

describe('validateA11y - A11Y_BUTTON_NO_LABEL', () => {
  it('should warn when button has no children and no aria-label', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'button',
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_BUTTON_NO_LABEL')).toBe(true);
    expect(warnings.find((w) => w.code === 'A11Y_BUTTON_NO_LABEL')?.severity).toBe('warning');
  });

  it('should warn when button has only non-text children (e.g. svg)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'button',
      children: [{ kind: 'element', tag: 'svg' }],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_BUTTON_NO_LABEL')).toBe(true);
  });

  it('should not warn when button has text child', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'button',
      children: [{ kind: 'text', value: { expr: 'lit', value: 'Click' } }],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_BUTTON_NO_LABEL')).toBe(false);
  });

  it('should not warn when button has aria-label prop', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'button',
      props: { 'aria-label': { expr: 'lit', value: 'Submit' } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_BUTTON_NO_LABEL')).toBe(false);
  });

  it('should not warn when button has dynamic aria-label', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'button',
      props: { 'aria-label': { expr: 'state', name: 'buttonLabel' } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_BUTTON_NO_LABEL')).toBe(false);
  });

  it('should not warn when button has empty children array but has aria-label', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'button',
      children: [],
      props: { 'aria-label': { expr: 'lit', value: 'Close' } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_BUTTON_NO_LABEL')).toBe(false);
  });
});

// ==================== A11Y_ANCHOR_NO_LABEL ====================

describe('validateA11y - A11Y_ANCHOR_NO_LABEL', () => {
  it('should warn when anchor has no text children and no aria-label', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'a',
      props: { href: { expr: 'lit', value: '#' } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_ANCHOR_NO_LABEL')).toBe(true);
    expect(warnings.find((w) => w.code === 'A11Y_ANCHOR_NO_LABEL')?.severity).toBe('warning');
  });

  it('should not warn when anchor has text child', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'a',
      props: { href: { expr: 'lit', value: '#' } },
      children: [{ kind: 'text', value: { expr: 'lit', value: 'Link' } }],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_ANCHOR_NO_LABEL')).toBe(false);
  });

  it('should not warn when anchor has aria-label prop', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'a',
      props: {
        href: { expr: 'lit', value: '/about' },
        'aria-label': { expr: 'lit', value: 'About page' },
      },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_ANCHOR_NO_LABEL')).toBe(false);
  });

  it('should warn when anchor has only element children (no text)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'a',
      props: { href: { expr: 'lit', value: '/' } },
      children: [{ kind: 'element', tag: 'img', props: { src: { expr: 'lit', value: 'logo.png' }, alt: { expr: 'lit', value: 'Logo' } } }],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_ANCHOR_NO_LABEL')).toBe(true);
  });
});

// ==================== A11Y_INPUT_NO_LABEL ====================

describe('validateA11y - A11Y_INPUT_NO_LABEL', () => {
  describe('input element', () => {
    it('should warn when input has no aria-label and no aria-labelledby', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'input',
        props: { type: { expr: 'lit', value: 'text' } },
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(true);
      expect(warnings.find((w) => w.code === 'A11Y_INPUT_NO_LABEL')?.severity).toBe('warning');
    });

    it('should not warn when input has aria-label', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'text' },
          'aria-label': { expr: 'lit', value: 'Username' },
        },
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(false);
    });

    it('should not warn when input has aria-labelledby', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'input',
        props: {
          type: { expr: 'lit', value: 'email' },
          'aria-labelledby': { expr: 'lit', value: 'email-label' },
        },
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(false);
    });

    it('should warn when input has no props at all', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'input',
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(true);
    });
  });

  describe('textarea element', () => {
    it('should warn when textarea has no aria-label and no aria-labelledby', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'textarea',
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(true);
    });

    it('should not warn when textarea has aria-labelledby', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'textarea',
        props: { 'aria-labelledby': { expr: 'lit', value: 'desc-label' } },
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(false);
    });
  });

  describe('select element', () => {
    it('should warn when select has no aria-label and no aria-labelledby', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'select',
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(true);
    });

    it('should not warn when select has aria-label', () => {
      const program = createProgram({
        kind: 'element',
        tag: 'select',
        props: { 'aria-label': { expr: 'lit', value: 'Choose country' } },
      });

      const warnings = validateA11y(program);

      expect(warnings.some((w) => w.code === 'A11Y_INPUT_NO_LABEL')).toBe(false);
    });
  });
});

// ==================== A11Y_HEADING_SKIP ====================

describe('validateA11y - A11Y_HEADING_SKIP', () => {
  it('should warn when heading level skips from h1 to h3', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }] },
        { kind: 'element', tag: 'h3', children: [{ kind: 'text', value: { expr: 'lit', value: 'Subsection' } }] },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_HEADING_SKIP')).toBe(true);
    expect(warnings.find((w) => w.code === 'A11Y_HEADING_SKIP')?.severity).toBe('warning');
  });

  it('should not warn when headings are sequential (h1 -> h2 -> h3)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }] },
        { kind: 'element', tag: 'h2', children: [{ kind: 'text', value: { expr: 'lit', value: 'Section' } }] },
        { kind: 'element', tag: 'h3', children: [{ kind: 'text', value: { expr: 'lit', value: 'Subsection' } }] },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_HEADING_SKIP')).toBe(false);
  });

  it('should warn when heading skips multiple levels (h1 -> h4)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }] },
        { kind: 'element', tag: 'h4', children: [{ kind: 'text', value: { expr: 'lit', value: 'Deep section' } }] },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_HEADING_SKIP')).toBe(true);
  });

  it('should track headings flat across the entire view tree', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'element',
          tag: 'header',
          children: [
            { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }] },
          ],
        },
        {
          kind: 'element',
          tag: 'main',
          children: [
            { kind: 'element', tag: 'h3', children: [{ kind: 'text', value: { expr: 'lit', value: 'Skipped!' } }] },
          ],
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_HEADING_SKIP')).toBe(true);
  });

  it('should allow descending heading levels (h3 -> h2 is not a skip)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }] },
        { kind: 'element', tag: 'h2', children: [{ kind: 'text', value: { expr: 'lit', value: 'Section' } }] },
        { kind: 'element', tag: 'h3', children: [{ kind: 'text', value: { expr: 'lit', value: 'Sub' } }] },
        { kind: 'element', tag: 'h2', children: [{ kind: 'text', value: { expr: 'lit', value: 'Another Section' } }] },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_HEADING_SKIP')).toBe(false);
  });
});

// ==================== A11Y_POSITIVE_TABINDEX ====================

describe('validateA11y - A11Y_POSITIVE_TABINDEX', () => {
  it('should warn when tabindex literal is greater than 0', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      props: { tabindex: { expr: 'lit', value: 5 } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_POSITIVE_TABINDEX')).toBe(true);
    expect(warnings.find((w) => w.code === 'A11Y_POSITIVE_TABINDEX')?.severity).toBe('warning');
  });

  it('should not warn when tabindex is 0', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      props: { tabindex: { expr: 'lit', value: 0 } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_POSITIVE_TABINDEX')).toBe(false);
  });

  it('should not warn when tabindex is -1', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      props: { tabindex: { expr: 'lit', value: -1 } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_POSITIVE_TABINDEX')).toBe(false);
  });

  it('should not warn when tabindex is a dynamic expression (cannot statically check)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      props: { tabindex: { expr: 'state', name: 'idx' } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_POSITIVE_TABINDEX')).toBe(false);
  });

  it('should warn when tabindex is 1', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'span',
      props: { tabindex: { expr: 'lit', value: 1 } },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_POSITIVE_TABINDEX')).toBe(true);
  });
});

// ==================== A11Y_DUPLICATE_ID ====================

describe('validateA11y - A11Y_DUPLICATE_ID', () => {
  it('should warn when two elements have the same literal id', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'main' } },
        },
        {
          kind: 'element',
          tag: 'section',
          props: { id: { expr: 'lit', value: 'main' } },
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_DUPLICATE_ID')).toBe(true);
    expect(warnings.find((w) => w.code === 'A11Y_DUPLICATE_ID')?.severity).toBe('warning');
  });

  it('should not warn when all literal ids are unique', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'element',
          tag: 'header',
          props: { id: { expr: 'lit', value: 'header' } },
        },
        {
          kind: 'element',
          tag: 'main',
          props: { id: { expr: 'lit', value: 'content' } },
        },
        {
          kind: 'element',
          tag: 'footer',
          props: { id: { expr: 'lit', value: 'footer' } },
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_DUPLICATE_ID')).toBe(false);
  });

  it('should not check dynamic id expressions (cannot statically verify)', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'state', name: 'id' } },
        },
        {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'state', name: 'id' } },
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_DUPLICATE_ID')).toBe(false);
  });

  it('should detect duplicates across deeply nested elements', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      props: { id: { expr: 'lit', value: 'root' } },
      children: [
        {
          kind: 'element',
          tag: 'section',
          children: [
            {
              kind: 'element',
              tag: 'div',
              children: [
                {
                  kind: 'element',
                  tag: 'span',
                  props: { id: { expr: 'lit', value: 'root' } },
                },
              ],
            },
          ],
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_DUPLICATE_ID')).toBe(true);
  });
});

// ==================== Integration Tests ====================

describe('validateA11y - Integration', () => {
  it('should return multiple warnings from a single AST', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        // A11Y_IMG_NO_ALT
        { kind: 'element', tag: 'img', props: { src: { expr: 'lit', value: 'pic.jpg' } } },
        // A11Y_BUTTON_NO_LABEL
        { kind: 'element', tag: 'button' },
        // A11Y_POSITIVE_TABINDEX
        { kind: 'element', tag: 'div', props: { tabindex: { expr: 'lit', value: 3 } } },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.length).toBeGreaterThanOrEqual(3);

    const codes = warnings.map((w) => w.code);
    expect(codes).toContain('A11Y_IMG_NO_ALT');
    expect(codes).toContain('A11Y_BUTTON_NO_LABEL');
    expect(codes).toContain('A11Y_POSITIVE_TABINDEX');
  });

  it('should traverse into if/then/else branches', () => {
    const program = createProgram({
      kind: 'if',
      condition: { expr: 'state', name: 'show' },
      then: {
        kind: 'element',
        tag: 'img',
        props: { src: { expr: 'lit', value: 'then.jpg' } },
        // Missing alt -> should warn
      },
      else: {
        kind: 'element',
        tag: 'img',
        props: { src: { expr: 'lit', value: 'else.jpg' } },
        // Missing alt -> should warn
      },
    });

    const warnings = validateA11y(program);

    const imgWarnings = warnings.filter((w) => w.code === 'A11Y_IMG_NO_ALT');
    expect(imgWarnings.length).toBe(2);
  });

  it('should traverse into each/body', () => {
    const program = createProgram({
      kind: 'each',
      items: { expr: 'state', name: 'items' },
      as: 'item',
      body: {
        kind: 'element',
        tag: 'button',
        // No children and no aria-label -> should warn
      },
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_BUTTON_NO_LABEL')).toBe(true);
  });

  it('should traverse into element/children recursively', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        {
          kind: 'element',
          tag: 'section',
          children: [
            {
              kind: 'element',
              tag: 'article',
              children: [
                {
                  kind: 'element',
                  tag: 'img',
                  props: { src: { expr: 'lit', value: 'deep.jpg' } },
                  // Missing alt -> should warn
                },
              ],
            },
          ],
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_IMG_NO_ALT')).toBe(true);
  });

  it('should emit no warnings for a fully accessible component', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      props: { id: { expr: 'lit', value: 'app' } },
      children: [
        {
          kind: 'element',
          tag: 'h1',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Welcome' } }],
        },
        {
          kind: 'element',
          tag: 'h2',
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Introduction' } }],
        },
        {
          kind: 'element',
          tag: 'img',
          props: {
            src: { expr: 'lit', value: 'hero.jpg' },
            alt: { expr: 'lit', value: 'Hero image' },
          },
        },
        {
          kind: 'element',
          tag: 'button',
          props: { tabindex: { expr: 'lit', value: 0 } },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'Get Started' } }],
        },
        {
          kind: 'element',
          tag: 'a',
          props: { href: { expr: 'lit', value: '/about' } },
          children: [{ kind: 'text', value: { expr: 'lit', value: 'About us' } }],
        },
        {
          kind: 'element',
          tag: 'input',
          props: {
            type: { expr: 'lit', value: 'text' },
            'aria-label': { expr: 'lit', value: 'Search' },
          },
        },
        {
          kind: 'element',
          tag: 'textarea',
          props: { 'aria-labelledby': { expr: 'lit', value: 'comment-label' } },
        },
        {
          kind: 'element',
          tag: 'select',
          props: { 'aria-label': { expr: 'lit', value: 'Country' } },
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.length).toBe(0);
  });

  it('should detect heading skip across if/then/else branches', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }] },
        {
          kind: 'if',
          condition: { expr: 'state', name: 'flag' },
          then: {
            kind: 'element',
            tag: 'h3',
            children: [{ kind: 'text', value: { expr: 'lit', value: 'Skipped in then' } }],
          },
        },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.some((w) => w.code === 'A11Y_HEADING_SKIP')).toBe(true);
  });

  it('should collect all warning types in a complex inaccessible AST', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        // A11Y_IMG_NO_ALT
        { kind: 'element', tag: 'img', props: { src: { expr: 'lit', value: 'a.jpg' } } },
        // A11Y_BUTTON_NO_LABEL
        { kind: 'element', tag: 'button', children: [{ kind: 'element', tag: 'svg' }] },
        // A11Y_ANCHOR_NO_LABEL
        { kind: 'element', tag: 'a', props: { href: { expr: 'lit', value: '#' } } },
        // A11Y_INPUT_NO_LABEL
        { kind: 'element', tag: 'input' },
        // A11Y_HEADING_SKIP (h1 -> h3)
        { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'Title' } }] },
        { kind: 'element', tag: 'h3', children: [{ kind: 'text', value: { expr: 'lit', value: 'Sub' } }] },
        // A11Y_POSITIVE_TABINDEX
        { kind: 'element', tag: 'span', props: { tabindex: { expr: 'lit', value: 10 } } },
        // A11Y_DUPLICATE_ID
        { kind: 'element', tag: 'div', props: { id: { expr: 'lit', value: 'dup' } } },
        { kind: 'element', tag: 'div', props: { id: { expr: 'lit', value: 'dup' } } },
      ],
    });

    const warnings = validateA11y(program);

    const codes = new Set(warnings.map((w) => w.code));
    expect(codes.has('A11Y_IMG_NO_ALT')).toBe(true);
    expect(codes.has('A11Y_BUTTON_NO_LABEL')).toBe(true);
    expect(codes.has('A11Y_ANCHOR_NO_LABEL')).toBe(true);
    expect(codes.has('A11Y_INPUT_NO_LABEL')).toBe(true);
    expect(codes.has('A11Y_HEADING_SKIP')).toBe(true);
    expect(codes.has('A11Y_POSITIVE_TABINDEX')).toBe(true);
    expect(codes.has('A11Y_DUPLICATE_ID')).toBe(true);
  });

  it('should return warnings with severity "warning" for all a11y rules', () => {
    const program = createProgram({
      kind: 'element',
      tag: 'div',
      children: [
        { kind: 'element', tag: 'img', props: { src: { expr: 'lit', value: 'x.jpg' } } },
        { kind: 'element', tag: 'button' },
        { kind: 'element', tag: 'a', props: { href: { expr: 'lit', value: '#' } } },
        { kind: 'element', tag: 'input' },
        { kind: 'element', tag: 'h1', children: [{ kind: 'text', value: { expr: 'lit', value: 'T' } }] },
        { kind: 'element', tag: 'h3', children: [{ kind: 'text', value: { expr: 'lit', value: 'S' } }] },
        { kind: 'element', tag: 'div', props: { tabindex: { expr: 'lit', value: 2 } } },
        { kind: 'element', tag: 'div', props: { id: { expr: 'lit', value: 'x' } } },
        { kind: 'element', tag: 'div', props: { id: { expr: 'lit', value: 'x' } } },
      ],
    });

    const warnings = validateA11y(program);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every((w) => w.severity === 'warning')).toBe(true);
  });
});
