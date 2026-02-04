/**
 * Test module for hydrateIf SSR/Client branch mismatch handling.
 *
 * Coverage:
 * - SSR-Client branch synchronization (then<->else, then<->none, none<->then)
 * - Backward compatibility with legacy SSR (no markers)
 * - Dynamic updates after initial mismatch fix
 *
 * Problem:
 * When SSG builds with cookie expressions (e.g., theme defaults to "dark" at build time),
 * but the client has a different cookie value (e.g., theme=light), the SSR-rendered DOM
 * shows the wrong branch. The hydrateIf function needs to detect and fix this mismatch.
 *
 * Solution:
 * SSR will output branch markers: <!--if:then-->, <!--if:else-->, <!--if:none-->
 * Hydration will detect the marker and compare with client evaluation.
 * If mismatch, replace DOM with correct branch.
 *
 * IMPORTANT: These tests use SSR markers that the current implementation does NOT support.
 * The markers are:
 * - <!--if:then--> : SSR rendered the "then" branch
 * - <!--if:else--> : SSR rendered the "else" branch
 * - <!--if:none--> : SSR rendered nothing (condition false, no else branch)
 *
 * Implementation must:
 * 1. Detect these markers in the DOM
 * 2. Compare SSR branch with client-side evaluation
 * 3. If mismatch, replace DOM immediately during initial hydration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CompiledProgram } from '@constela/compiler';
import { hydrateApp } from '../src/hydrate.js';

describe('hydrateIf SSR/Client branch mismatch', () => {
  // ==================== Setup ====================

  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ==================== Helper to create minimal program ====================

  function createMinimalProgram(overrides?: Partial<CompiledProgram>): CompiledProgram {
    return {
      version: '1.0',
      state: {},
      actions: {},
      view: { kind: 'element', tag: 'div' },
      ...overrides,
    };
  }

  // ==================== SSR-Client Branch Synchronization ====================

  describe('SSR-Client branch synchronization', () => {
    it('should replace DOM when SSR=then but client=else', async () => {
      /**
       * Scenario: Theme toggle icon
       * - SSG built with theme="dark" (default at build time) -> shows sun icon (then branch)
       * - Client has cookie theme="light" -> should show moon icon (else branch)
       *
       * SSR output: <!--if:then--><span id="sun">sun</span>
       * Client state: isDark=0 (false) -> should show else branch
       * Expected: DOM should be replaced with <span id="moon">moon</span>
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          // Client evaluates to false (0) -> should show else branch
          isDark: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'isDark' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'sun' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'sun' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'moon' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'moon' } }],
              },
            },
          ],
        },
      });

      // SSR output with marker indicating "then" branch was rendered
      // (simulating SSG build where isDark defaulted to true)
      container.innerHTML = '<div><!--if:then--><span id="sun">sun</span></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - DOM should be replaced with else branch (moon)
      expect(container.querySelector('#sun')).toBeNull();
      expect(container.querySelector('#moon')).not.toBeNull();
      expect(container.querySelector('#moon')?.textContent).toBe('moon');
    });

    it('should replace DOM when SSR=else but client=then', async () => {
      /**
       * Scenario: Theme toggle icon (reverse)
       * - SSG built with theme="light" (default at build time) -> shows moon icon (else branch)
       * - Client has cookie theme="dark" -> should show sun icon (then branch)
       *
       * SSR output: <!--if:else--><span id="moon">moon</span>
       * Client state: isDark=1 (true) -> should show then branch
       * Expected: DOM should be replaced with <span id="sun">sun</span>
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          // Client evaluates to true (1) -> should show then branch
          isDark: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'isDark' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'sun' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'sun' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'moon' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'moon' } }],
              },
            },
          ],
        },
      });

      // SSR output with marker indicating "else" branch was rendered
      container.innerHTML = '<div><!--if:else--><span id="moon">moon</span></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - DOM should be replaced with then branch (sun)
      expect(container.querySelector('#moon')).toBeNull();
      expect(container.querySelector('#sun')).not.toBeNull();
      expect(container.querySelector('#sun')?.textContent).toBe('sun');
    });

    it('should insert DOM when SSR=none but client=then', async () => {
      /**
       * Scenario: Conditional banner
       * - SSG built with showBanner=false -> rendered nothing
       * - Client evaluates to showBanner=true -> should show banner
       *
       * SSR output: <!--if:none-->
       * Client state: showBanner=1 (true) -> should show then branch
       * Expected: DOM should be inserted with <div id="banner">Welcome!</div>
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          // Client evaluates to true (1) -> should show then branch
          showBanner: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showBanner' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'banner' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Welcome!' } }],
              },
              // No else branch
            },
          ],
        },
      });

      // SSR output with marker indicating nothing was rendered (no else branch, condition was false)
      container.innerHTML = '<div><!--if:none--></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - DOM should be inserted with then branch (banner)
      expect(container.querySelector('#banner')).not.toBeNull();
      expect(container.querySelector('#banner')?.textContent).toBe('Welcome!');
    });

    it('should remove DOM when SSR=then but client=none', async () => {
      /**
       * Scenario: Conditional banner (reverse)
       * - SSG built with showBanner=true -> rendered banner
       * - Client evaluates to showBanner=false -> should show nothing (no else)
       *
       * SSR output: <!--if:then--><div id="banner">Welcome!</div>
       * Client state: showBanner=0 (false), no else branch -> should show nothing
       * Expected: DOM should be removed
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          // Client evaluates to false (0), no else branch -> should show nothing
          showBanner: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showBanner' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'banner' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Welcome!' } }],
              },
              // No else branch
            },
          ],
        },
      });

      // SSR output with marker indicating "then" branch was rendered
      container.innerHTML = '<div><!--if:then--><div id="banner">Welcome!</div></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - DOM should be removed (no banner visible)
      expect(container.querySelector('#banner')).toBeNull();
    });

    it('should handle text-only branches during mismatch', async () => {
      /**
       * Scenario: Simple text content mismatch
       * - SSG built with condition=true -> rendered "Yes"
       * - Client evaluates to condition=false -> should show "No"
       *
       * This tests that text nodes (not elements) are also handled correctly.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          condition: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          props: { id: { expr: 'lit', value: 'wrapper' } },
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'condition' },
              then: {
                kind: 'text',
                value: { expr: 'lit', value: 'Yes' },
              },
              else: {
                kind: 'text',
                value: { expr: 'lit', value: 'No' },
              },
            },
          ],
        },
      });

      // SSR output with marker indicating "then" branch was rendered
      container.innerHTML = '<div id="wrapper"><!--if:then-->Yes</div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - Content should be replaced with "No"
      expect(container.querySelector('#wrapper')?.textContent).toBe('No');
    });
  });

  // ==================== Backward Compatibility ====================

  describe('backward compatibility', () => {
    it('should work without SSR markers (legacy behavior)', async () => {
      /**
       * Old SSR HTML without markers should still work.
       * When no marker is present, hydration assumes SSR matches client
       * and proceeds with normal hydration (no branch replacement).
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          showContent: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showContent' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'content' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Visible' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'placeholder' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Hidden' } }],
              },
            },
          ],
        },
      });

      // Legacy SSR output without any markers
      container.innerHTML = '<div><span id="content">Visible</span></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - Should hydrate normally without replacing DOM
      expect(container.querySelector('#content')).not.toBeNull();
      expect(container.querySelector('#content')?.textContent).toBe('Visible');
      expect(container.querySelector('#placeholder')).toBeNull();
    });

    it('should preserve existing behavior for matching SSR/client state', async () => {
      /**
       * When SSR and client agree on the branch (with markers present),
       * no replacement should occur.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          isDark: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'isDark' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'sun' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'sun' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'moon' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'moon' } }],
              },
            },
          ],
        },
      });

      // SSR output with marker indicating "then" branch - matches client state
      container.innerHTML = '<div><!--if:then--><span id="sun">sun</span></div>';

      // Get reference to the existing span
      const existingSpan = container.querySelector('#sun');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - Same node should be preserved (not recreated)
      expect(container.querySelector('#sun')).toBe(existingSpan);
      expect(container.querySelector('#moon')).toBeNull();
    });
  });

  // ==================== Dynamic Updates After Initial Mismatch Fix ====================

  describe('dynamic updates after initial mismatch fix', () => {
    it('should still respond to state changes after initial mismatch fix', async () => {
      /**
       * After the initial mismatch is fixed (e.g., SSR=then -> client=else),
       * subsequent state changes should still trigger DOM updates.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          isDark: { type: 'number', initial: 0 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'isDark' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'sun' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'sun' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'moon' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'moon' } }],
              },
            },
          ],
        },
      });

      // SSR rendered "then" (sun), but client state is false (moon)
      container.innerHTML = '<div><!--if:then--><span id="sun">sun</span></div>';

      // Act - Phase 1: Initial hydration fixes mismatch
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Verify initial mismatch was fixed
      expect(container.querySelector('#sun')).toBeNull();
      expect(container.querySelector('#moon')).not.toBeNull();

      // Act - Phase 2: Change state to show sun
      app.setState('isDark', 1);
      await Promise.resolve();

      // Assert - Should now show sun again
      expect(container.querySelector('#moon')).toBeNull();
      expect(container.querySelector('#sun')).not.toBeNull();
      expect(container.querySelector('#sun')?.textContent).toBe('sun');

      // Act - Phase 3: Change state back to show moon
      app.setState('isDark', 0);
      await Promise.resolve();

      // Assert - Should show moon
      expect(container.querySelector('#sun')).toBeNull();
      expect(container.querySelector('#moon')).not.toBeNull();
    });

    it('should handle multiple if nodes with different mismatch scenarios', async () => {
      /**
       * Multiple if nodes in the same view, each with different mismatch scenarios.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          // SSR=true (then), client=false (else)
          showHeader: { type: 'number', initial: 0 },
          // SSR=false (else), client=true (then)
          showFooter: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showHeader' },
              then: {
                kind: 'element',
                tag: 'header',
                props: { id: { expr: 'lit', value: 'header' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Header' } }],
              },
              else: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'no-header' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'No Header' } }],
              },
            },
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showFooter' },
              then: {
                kind: 'element',
                tag: 'footer',
                props: { id: { expr: 'lit', value: 'footer' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Footer' } }],
              },
              else: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'no-footer' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'No Footer' } }],
              },
            },
          ],
        },
      });

      // SSR: showHeader=true (header), showFooter=false (no-footer)
      // Client: showHeader=false (no-header), showFooter=true (footer)
      container.innerHTML = '<div><!--if:then--><header id="header">Header</header><!--if:else--><div id="no-footer">No Footer</div></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - Both should be corrected
      // Header should be replaced with no-header
      expect(container.querySelector('#header')).toBeNull();
      expect(container.querySelector('#no-header')).not.toBeNull();

      // Footer should be replaced with footer
      expect(container.querySelector('#no-footer')).toBeNull();
      expect(container.querySelector('#footer')).not.toBeNull();
    });

    it('should handle nested if nodes with mismatch', async () => {
      /**
       * Nested if nodes where the outer one has a mismatch.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          showOuter: { type: 'number', initial: 0 },
          showInner: { type: 'number', initial: 1 },
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showOuter' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'outer' } },
                children: [
                  {
                    kind: 'if',
                    condition: { expr: 'state', name: 'showInner' },
                    then: {
                      kind: 'element',
                      tag: 'span',
                      props: { id: { expr: 'lit', value: 'inner' } },
                      children: [{ kind: 'text', value: { expr: 'lit', value: 'Inner' } }],
                    },
                  },
                ],
              },
              else: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'outer-else' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Outer Else' } }],
              },
            },
          ],
        },
      });

      // SSR: showOuter=true rendered the outer div with nested content
      // Client: showOuter=false should show outer-else
      container.innerHTML = '<div><!--if:then--><div id="outer"><!--if:then--><span id="inner">Inner</span></div></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - Outer should be replaced with else branch
      expect(container.querySelector('#outer')).toBeNull();
      expect(container.querySelector('#inner')).toBeNull();
      expect(container.querySelector('#outer-else')).not.toBeNull();
      expect(container.querySelector('#outer-else')?.textContent).toBe('Outer Else');
    });
  });

  // ==================== Marker Detection Tests ====================

  describe('marker detection', () => {
    it('should detect <!--if:then--> marker and use it for comparison', async () => {
      /**
       * This test specifically validates that the marker IS being read.
       *
       * The scenario is designed so that:
       * - SSR marker says "then" was rendered (<!--if:then-->)
       * - Client evaluates condition to FALSE
       * - But the actual DOM content is ALREADY the else branch content
       *
       * If markers are NOT read, the code would see:
       *   "Client wants else, DOM shows else-like content" -> no replacement needed (WRONG)
       *
       * If markers ARE read, the code would see:
       *   "SSR rendered then (per marker), client wants else" -> replace needed (CORRECT)
       *
       * The difference is: with marker detection, even if DOM looks like the right branch,
       * we know from the marker that it was SSR'd as the OTHER branch.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          condition: { type: 'number', initial: 0 }, // Client evaluates to false -> else
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'condition' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'then-branch' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'THEN' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'else-branch' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'ELSE' } }],
              },
            },
          ],
        },
      });

      // CRITICAL: Marker says "then" but DOM actually has else-branch ID
      // This simulates a corrupted/modified SSR output
      // Without marker detection: code might think "DOM is already else, no need to replace"
      // With marker detection: code knows "marker says then, need to replace with else"
      container.innerHTML = '<div><!--if:then--><span id="else-branch">Modified Content</span></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      // The implementation should:
      // 1. Read marker: "then"
      // 2. Evaluate condition: false -> client wants "else"
      // 3. Detect mismatch: SSR=then, client=else
      // 4. REPLACE the DOM with freshly rendered "else" branch
      // 5. Result: content should be "ELSE" (from program definition), not "Modified Content"
      const elseBranch = container.querySelector('#else-branch');
      expect(elseBranch).not.toBeNull();
      expect(elseBranch?.textContent).toBe('ELSE'); // Should be freshly rendered, not the SSR content
    });

    it('should detect <!--if:else--> marker and use it for comparison', async () => {
      /**
       * Similar test but with else marker.
       *
       * - SSR marker says "else" was rendered (<!--if:else-->)
       * - Client evaluates condition to TRUE
       * - DOM content is modified
       *
       * Implementation should detect marker says "else" but client wants "then",
       * and replace with freshly rendered "then" branch.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          condition: { type: 'number', initial: 1 }, // Client evaluates to true -> then
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'condition' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'then-branch' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'THEN' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'else-branch' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'ELSE' } }],
              },
            },
          ],
        },
      });

      // Marker says "else" but DOM has then-branch ID
      container.innerHTML = '<div><!--if:else--><span id="then-branch">Modified Content</span></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - Should be freshly rendered "THEN", not "Modified Content"
      const thenBranch = container.querySelector('#then-branch');
      expect(thenBranch).not.toBeNull();
      expect(thenBranch?.textContent).toBe('THEN');
    });

    it('should detect <!--if:none--> marker when SSR rendered nothing', async () => {
      /**
       * Test for the "none" marker case.
       *
       * - SSR marker says nothing was rendered (<!--if:none-->)
       * - Client evaluates condition to TRUE
       *
       * Implementation should detect marker says "none" but client wants "then",
       * and INSERT freshly rendered "then" branch.
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          condition: { type: 'number', initial: 1 }, // Client evaluates to true -> then
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'condition' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'content' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Content' } }],
              },
              // No else branch
            },
          ],
        },
      });

      // Marker says "none" (nothing was rendered)
      container.innerHTML = '<div><!--if:none--></div>';

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - "then" branch should be inserted
      expect(container.querySelector('#content')).not.toBeNull();
      expect(container.querySelector('#content')?.textContent).toBe('Content');
    });

    it('should not replace DOM when marker matches client evaluation', async () => {
      /**
       * When marker matches client evaluation, no replacement should occur.
       * This tests that we're not unnecessarily replacing DOM.
       *
       * In a real scenario, SSR renders the same value as client evaluation.
       * The test verifies that the element node is preserved (not recreated).
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          condition: { type: 'number', initial: 1 }, // Client evaluates to true -> then
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'condition' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'content' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Content' } }],
              },
              else: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'placeholder' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Placeholder' } }],
              },
            },
          ],
        },
      });

      // Marker says "then", client wants "then" -> match
      // SSR content matches what the program would render
      container.innerHTML = '<div><!--if:then--><span id="content">Content</span></div>';

      // Get reference to existing node
      const existingSpan = container.querySelector('#content');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert - Same node should be preserved (hydrated in place, not replaced)
      expect(container.querySelector('#content')).toBe(existingSpan);
      // Content should be preserved (SSR rendered the correct value)
      expect(container.querySelector('#content')?.textContent).toBe('Content');
    });
  });

  // ==================== Consecutive If Nodes ====================

  describe('consecutive if nodes', () => {
    it('should handle consecutive if nodes with none followed by then', async () => {
      /**
       * Scenario: Two consecutive if nodes
       * - First if: condition false, no else -> none (no DOM)
       * - Second if: condition true -> then (has DOM)
       *
       * Bug: When first if has "none", the marker search for second if
       * may incorrectly find the first if's marker due to domChildren
       * array excluding comment nodes.
       *
       * SSR output: <!--if:none--><!--if:then--><div>Loading...</div>
       * Expected: First if should have no DOM, second if should hydrate the Loading div
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          errorMsg: { type: 'string', initial: '' }, // falsy -> first if is none
          isLoading: { type: 'number', initial: 1 }, // truthy -> second if is then
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'errorMsg' },
              then: {
                kind: 'element',
                tag: 'span',
                props: {},
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Error' } }],
              },
              // No else branch
            },
            {
              kind: 'if',
              condition: { expr: 'state', name: 'isLoading' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'loading' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Loading...' } }],
              },
              // No else branch
            },
          ],
        },
      });

      // SSR output: first if rendered nothing (none), second if rendered then branch
      container.innerHTML = '<div><!--if:none--><!--if:then--><div id="loading">Loading...</div></div>';

      // Get reference to the existing div to verify it's hydrated (not replaced)
      const existingDiv = container.querySelector('#loading');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      // First if should have inserted nothing (errorMsg is empty string = falsy)
      // Second if should have hydrated the existing Loading div
      expect(container.querySelector('#loading')).not.toBeNull();
      expect(container.querySelector('#loading')?.textContent).toBe('Loading...');

      // Verify the Loading div is still the same element (hydrated, not replaced)
      expect(container.querySelector('#loading')).toBe(existingDiv);
    });

    it('should handle consecutive if nodes with then followed by none', async () => {
      /**
       * Scenario: Two consecutive if nodes
       * - First if: condition true -> then (has DOM)
       * - Second if: condition false, no else -> none (no DOM)
       *
       * SSR output: <!--if:then--><span>Visible</span><!--if:none-->
       * Expected: First if should hydrate the span, second if should have no DOM
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          showFirst: { type: 'number', initial: 1 }, // truthy -> first if is then
          showSecond: { type: 'number', initial: 0 }, // falsy -> second if is none
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showFirst' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'visible' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Visible' } }],
              },
              // No else branch
            },
            {
              kind: 'if',
              condition: { expr: 'state', name: 'showSecond' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'hidden' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Hidden' } }],
              },
              // No else branch
            },
          ],
        },
      });

      // SSR output: first if rendered then branch, second if rendered nothing (none)
      container.innerHTML = '<div><!--if:then--><span id="visible">Visible</span><!--if:none--></div>';

      // Get reference to the existing span to verify it's hydrated (not replaced)
      const existingSpan = container.querySelector('#visible');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      // First if should have hydrated the span
      expect(container.querySelector('#visible')).not.toBeNull();
      expect(container.querySelector('#visible')?.textContent).toBe('Visible');
      expect(container.querySelector('#visible')).toBe(existingSpan);

      // Second if should have inserted nothing
      expect(container.querySelector('#hidden')).toBeNull();
    });

    it('should handle three consecutive if nodes with mixed branches', async () => {
      /**
       * Scenario: Three consecutive if nodes
       * - First if: condition false, no else -> none
       * - Second if: condition true -> then
       * - Third if: condition false, no else -> none
       *
       * This tests the most complex case where multiple "none" markers
       * surround a "then" marker. The marker detection must correctly
       * associate each marker with its corresponding if node.
       *
       * SSR output: <!--if:none--><!--if:then--><p>Middle</p><!--if:none-->
       * Expected: Only the middle paragraph should be hydrated
       */

      // Arrange
      const program = createMinimalProgram({
        state: {
          first: { type: 'number', initial: 0 }, // falsy -> none
          second: { type: 'number', initial: 1 }, // truthy -> then
          third: { type: 'number', initial: 0 }, // falsy -> none
        },
        view: {
          kind: 'element',
          tag: 'div',
          children: [
            {
              kind: 'if',
              condition: { expr: 'state', name: 'first' },
              then: {
                kind: 'element',
                tag: 'span',
                props: { id: { expr: 'lit', value: 'first' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'First' } }],
              },
              // No else branch
            },
            {
              kind: 'if',
              condition: { expr: 'state', name: 'second' },
              then: {
                kind: 'element',
                tag: 'p',
                props: { id: { expr: 'lit', value: 'middle' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Middle' } }],
              },
              // No else branch
            },
            {
              kind: 'if',
              condition: { expr: 'state', name: 'third' },
              then: {
                kind: 'element',
                tag: 'div',
                props: { id: { expr: 'lit', value: 'third' } },
                children: [{ kind: 'text', value: { expr: 'lit', value: 'Third' } }],
              },
              // No else branch
            },
          ],
        },
      });

      // SSR output: first none, second then, third none
      container.innerHTML = '<div><!--if:none--><!--if:then--><p id="middle">Middle</p><!--if:none--></div>';

      // Get reference to the existing paragraph to verify it's hydrated (not replaced)
      const existingP = container.querySelector('#middle');

      // Act
      const app = hydrateApp({ program, container });
      await Promise.resolve();

      // Assert
      // First if should have no DOM
      expect(container.querySelector('#first')).toBeNull();

      // Second if should have hydrated the paragraph
      expect(container.querySelector('#middle')).not.toBeNull();
      expect(container.querySelector('#middle')?.textContent).toBe('Middle');
      expect(container.querySelector('#middle')).toBe(existingP);

      // Third if should have no DOM
      expect(container.querySelector('#third')).toBeNull();
    });
  });
});
