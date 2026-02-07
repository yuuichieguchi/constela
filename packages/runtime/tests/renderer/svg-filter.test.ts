/**
 * Test module for SVG Filter Primitive Namespace Rendering.
 *
 * Coverage:
 * - feGaussianBlur has SVG namespace and camelCase tagName
 * - feOffset has SVG namespace and camelCase tagName
 * - feComponentTransfer and feFuncA have SVG namespace
 * - feMerge and feMergeNode have SVG namespace
 * - Complete filter chain preserves SVG namespace for all primitives
 * - feGaussianBlur attributes are correctly applied
 *
 * Root cause: SVG_TAGS whitelist does not include SVG filter primitives,
 * causing them to be created with document.createElement() instead of
 * document.createElementNS(), which lowercases tag names and breaks SVG.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render } from '../../src/renderer/index.js';
import type { RenderContext } from '../../src/renderer/index.js';
import { createStateStore } from '../../src/state/store.js';
import type { CompiledElementNode, CompiledAction } from '@constela/compiler';

describe('SVG filter primitive namespace rendering', () => {
  // ==================== Setup ====================

  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

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

  // ==================== Helper to build SVG > defs > filter tree ====================

  function buildFilterTree(filterChildren: CompiledElementNode[]): CompiledElementNode {
    return {
      kind: 'element',
      tag: 'svg',
      props: {
        width: { expr: 'lit', value: '200' },
        height: { expr: 'lit', value: '200' },
      },
      children: [
        {
          kind: 'element',
          tag: 'defs',
          children: [
            {
              kind: 'element',
              tag: 'filter',
              props: {
                id: { expr: 'lit', value: 'testFilter' },
              },
              children: filterChildren,
            },
          ],
        },
      ],
    };
  }

  // ==================== feGaussianBlur ====================

  it('feGaussianBlur inside filter should have SVG namespace', () => {
    // Arrange
    const node = buildFilterTree([
      {
        kind: 'element',
        tag: 'feGaussianBlur',
        props: {
          stdDeviation: { expr: 'lit', value: '5' },
        },
      },
    ]);
    const context = createContext();

    // Act
    const result = render(node, context) as SVGSVGElement;
    const defs = result.firstChild as Element;
    const filter = defs.firstChild as Element;
    const feGaussianBlur = filter.firstChild as Element;

    // Assert
    expect(feGaussianBlur.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feGaussianBlur.tagName).toBe('feGaussianBlur');
  });

  // ==================== feOffset ====================

  it('feOffset inside filter should have SVG namespace', () => {
    // Arrange
    const node = buildFilterTree([
      {
        kind: 'element',
        tag: 'feOffset',
        props: {
          dx: { expr: 'lit', value: '2' },
          dy: { expr: 'lit', value: '2' },
        },
      },
    ]);
    const context = createContext();

    // Act
    const result = render(node, context) as SVGSVGElement;
    const defs = result.firstChild as Element;
    const filter = defs.firstChild as Element;
    const feOffset = filter.firstChild as Element;

    // Assert
    expect(feOffset.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feOffset.tagName).toBe('feOffset');
  });

  // ==================== feComponentTransfer + feFuncA ====================

  it('feComponentTransfer and feFuncA should have SVG namespace', () => {
    // Arrange
    const node = buildFilterTree([
      {
        kind: 'element',
        tag: 'feComponentTransfer',
        children: [
          {
            kind: 'element',
            tag: 'feFuncA',
            props: {
              type: { expr: 'lit', value: 'linear' },
              slope: { expr: 'lit', value: '0.5' },
            },
          },
        ],
      },
    ]);
    const context = createContext();

    // Act
    const result = render(node, context) as SVGSVGElement;
    const defs = result.firstChild as Element;
    const filter = defs.firstChild as Element;
    const feComponentTransfer = filter.firstChild as Element;
    const feFuncA = feComponentTransfer.firstChild as Element;

    // Assert
    expect(feComponentTransfer.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feComponentTransfer.tagName).toBe('feComponentTransfer');
    expect(feFuncA.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feFuncA.tagName).toBe('feFuncA');
  });

  // ==================== feMerge + feMergeNode ====================

  it('feMerge and feMergeNode should have SVG namespace', () => {
    // Arrange
    const node = buildFilterTree([
      {
        kind: 'element',
        tag: 'feMerge',
        children: [
          {
            kind: 'element',
            tag: 'feMergeNode',
            props: {
              in: { expr: 'lit', value: 'SourceGraphic' },
            },
          },
          {
            kind: 'element',
            tag: 'feMergeNode',
            props: {
              in: { expr: 'lit', value: 'blur' },
            },
          },
        ],
      },
    ]);
    const context = createContext();

    // Act
    const result = render(node, context) as SVGSVGElement;
    const defs = result.firstChild as Element;
    const filter = defs.firstChild as Element;
    const feMerge = filter.firstChild as Element;
    const feMergeNode1 = feMerge.children[0] as Element;
    const feMergeNode2 = feMerge.children[1] as Element;

    // Assert
    expect(feMerge.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feMerge.tagName).toBe('feMerge');
    expect(feMergeNode1.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feMergeNode1.tagName).toBe('feMergeNode');
    expect(feMergeNode2.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feMergeNode2.tagName).toBe('feMergeNode');
  });

  // ==================== Complete filter chain ====================

  it('complete filter chain (feGaussianBlur + feOffset + feMerge) should all have SVG namespace', () => {
    // Arrange
    const node = buildFilterTree([
      {
        kind: 'element',
        tag: 'feGaussianBlur',
        props: {
          in: { expr: 'lit', value: 'SourceAlpha' },
          stdDeviation: { expr: 'lit', value: '4' },
          result: { expr: 'lit', value: 'blur' },
        },
      },
      {
        kind: 'element',
        tag: 'feOffset',
        props: {
          in: { expr: 'lit', value: 'blur' },
          dx: { expr: 'lit', value: '4' },
          dy: { expr: 'lit', value: '4' },
          result: { expr: 'lit', value: 'offsetBlur' },
        },
      },
      {
        kind: 'element',
        tag: 'feMerge',
        children: [
          {
            kind: 'element',
            tag: 'feMergeNode',
            props: {
              in: { expr: 'lit', value: 'offsetBlur' },
            },
          },
          {
            kind: 'element',
            tag: 'feMergeNode',
            props: {
              in: { expr: 'lit', value: 'SourceGraphic' },
            },
          },
        ],
      },
    ]);
    const context = createContext();

    // Act
    const result = render(node, context) as SVGSVGElement;
    const defs = result.firstChild as Element;
    const filter = defs.firstChild as Element;
    const feGaussianBlur = filter.children[0] as Element;
    const feOffset = filter.children[1] as Element;
    const feMerge = filter.children[2] as Element;
    const feMergeNode1 = feMerge.children[0] as Element;
    const feMergeNode2 = feMerge.children[1] as Element;

    // Assert - all filter primitives should have SVG namespace
    expect(feGaussianBlur.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feGaussianBlur.tagName).toBe('feGaussianBlur');

    expect(feOffset.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feOffset.tagName).toBe('feOffset');

    expect(feMerge.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feMerge.tagName).toBe('feMerge');

    expect(feMergeNode1.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feMergeNode1.tagName).toBe('feMergeNode');

    expect(feMergeNode2.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feMergeNode2.tagName).toBe('feMergeNode');
  });

  // ==================== Attribute verification ====================

  it('feGaussianBlur should have correct attributes', () => {
    // Arrange
    const node = buildFilterTree([
      {
        kind: 'element',
        tag: 'feGaussianBlur',
        props: {
          stdDeviation: { expr: 'lit', value: '5' },
          in: { expr: 'lit', value: 'SourceGraphic' },
        },
      },
    ]);
    const context = createContext();

    // Act
    const result = render(node, context) as SVGSVGElement;
    const defs = result.firstChild as Element;
    const filter = defs.firstChild as Element;
    const feGaussianBlur = filter.firstChild as Element;

    // Assert
    expect(feGaussianBlur.namespaceURI).toBe(SVG_NAMESPACE);
    expect(feGaussianBlur.tagName).toBe('feGaussianBlur');
    expect(feGaussianBlur.getAttribute('stdDeviation')).toBe('5');
    expect(feGaussianBlur.getAttribute('in')).toBe('SourceGraphic');
  });
});
