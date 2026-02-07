/**
 * Test module for Streaming SSR Renderer - LocalState Inter-Field Dependencies.
 *
 * Coverage:
 * - Field B references field A with literal initial value (object + get)
 * - Field B computes from two properties of field A (bin + get)
 * - Three-field chain A -> B -> C
 *
 * BUG: When field B's initial value references field A via
 * { expr: 'local', name: '_fieldA' }, field A is undefined because
 * the localState initialization loop in renderLocalStateToStream does NOT
 * progressively update ctx.locals as each field is initialized.
 *
 * TDD Red Phase: These tests should FAIL until the progressive locals
 * fix is applied to packages/server/src/streaming.ts renderLocalStateToStream().
 */

import { describe, it, expect } from 'vitest';
import { renderToStream } from '../streaming.js';
import type { CompiledProgram } from '@constela/compiler';
import type { StreamingRenderOptions } from '@constela/core';

// ==================== Helper Functions ====================

function createProgram(
  view: CompiledProgram['view'],
  state: CompiledProgram['state'] = {},
  actions: CompiledProgram['actions'] = {}
): CompiledProgram {
  return {
    version: '1.0',
    state,
    actions,
    view,
  };
}

/**
 * Collects all chunks from a ReadableStream into a single string
 */
async function streamToString(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return chunks.join('');
}

describe('renderToStream - localState inter-field dependencies', () => {
  const streamOptions: StreamingRenderOptions = {
    streaming: true,
    flushStrategy: 'immediate',
  };

  // ==================== Test Case 1: Field B references Field A ====================

  describe('field B references field A with literal initial value', () => {
    it('should resolve _gridMin from _bounds.min when _bounds is an object literal', async () => {
      /**
       * Given: localState with _bounds = { min: 0, max: 100 } and
       *        _gridMin = { expr: 'get', base: { expr: 'local', name: '_bounds' }, path: 'min' }
       * When: renderToStream is called and stream is consumed
       * Then: The output should contain "0" as the text content
       *
       * Currently BROKEN: _bounds is not in ctx.locals when _gridMin is evaluated.
       */

      // Arrange
      const program = createProgram({
        kind: 'localState',
        state: {
          _bounds: {
            type: 'object',
            initial: { min: 0, max: 100 },
          },
          _gridMin: {
            type: 'number',
            initial: {
              expr: 'get',
              base: { expr: 'local', name: '_bounds' },
              path: 'min',
            },
          },
        },
        actions: {},
        child: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'local', name: '_gridMin' } },
          ],
        },
      } as CompiledProgram['view']);

      // Act
      const stream = renderToStream(program, streamOptions);
      const html = await streamToString(stream);

      // Assert
      expect(html).toBe('<span>0</span>');
    });
  });

  // ==================== Test Case 2: Field B computes from Field A properties ====================

  describe('field B computes from two properties of field A', () => {
    it('should resolve _range as _bounds.max - _bounds.min', async () => {
      /**
       * Given: localState with _bounds = { min: 10, max: 200 } and
       *        _range = bin('-', get(_bounds, 'max'), get(_bounds, 'min'))
       * When: renderToStream is called and stream is consumed
       * Then: The output should contain "190"
       *
       * Currently BROKEN: _bounds is undefined, both get() return undefined,
       * bin('-') produces NaN.
       */

      // Arrange
      const program = createProgram({
        kind: 'localState',
        state: {
          _bounds: {
            type: 'object',
            initial: { min: 10, max: 200 },
          },
          _range: {
            type: 'number',
            initial: {
              expr: 'bin',
              op: '-',
              left: {
                expr: 'get',
                base: { expr: 'local', name: '_bounds' },
                path: 'max',
              },
              right: {
                expr: 'get',
                base: { expr: 'local', name: '_bounds' },
                path: 'min',
              },
            },
          },
        },
        actions: {},
        child: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'local', name: '_range' } },
          ],
        },
      } as CompiledProgram['view']);

      // Act
      const stream = renderToStream(program, streamOptions);
      const html = await streamToString(stream);

      // Assert
      expect(html).toBe('<span>190</span>');
    });
  });

  // ==================== Test Case 3: Three-field chain A -> B -> C ====================

  describe('three-field chain A -> B -> C', () => {
    it('should resolve _tripled through chain _base -> _doubled -> _tripled', async () => {
      /**
       * Given: localState with:
       *   _base = 10 (literal)
       *   _doubled = _base * 2
       *   _tripled = _doubled + _base
       * When: renderToStream is called and stream is consumed
       * Then: The output should contain "30" (10*2 + 10)
       *
       * Currently BROKEN: _base is undefined when _doubled is evaluated,
       * so _doubled = NaN, _tripled = NaN.
       */

      // Arrange
      const program = createProgram({
        kind: 'localState',
        state: {
          _base: {
            type: 'number',
            initial: 10,
          },
          _doubled: {
            type: 'number',
            initial: {
              expr: 'bin',
              op: '*',
              left: { expr: 'local', name: '_base' },
              right: { expr: 'lit', value: 2 },
            },
          },
          _tripled: {
            type: 'number',
            initial: {
              expr: 'bin',
              op: '+',
              left: { expr: 'local', name: '_doubled' },
              right: { expr: 'local', name: '_base' },
            },
          },
        },
        actions: {},
        child: {
          kind: 'element',
          tag: 'span',
          children: [
            { kind: 'text', value: { expr: 'local', name: '_tripled' } },
          ],
        },
      } as CompiledProgram['view']);

      // Act
      const stream = renderToStream(program, streamOptions);
      const html = await streamToString(stream);

      // Assert
      expect(html).toBe('<span>30</span>');
    });
  });
});
